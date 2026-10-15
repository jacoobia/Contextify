const contextEvent = 'contextmenu';
const keyPressEvent = 'keydown';
const mouseClickEvent = 'mousedown';
const mouseEnterEvent = 'mouseenter';
const mouseLeaveEvent = 'mouseleave';

/* Attribute */
const clickAttribute = 'click';
const childAttribute = 'child';
const typeAttribute = 'type';
const iconAttribute = 'icon';
const textAttribute = 'text';
const hotkeyAttribute = 'hotkey';
const hotkeyLabelAttribute = 'hotkeyLabel';
const colourAttribute = 'colour';
const textColourAttribute = 'textcolour';
const enabledAttribute = 'enabled';

const childTimeout = 200;

const modifierKeys: Record<string, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'> = {
    ctrl: 'ctrlKey', control: 'ctrlKey',
    alt: 'altKey', option: 'altKey',
    shift: 'shiftKey',
    meta: 'metaKey', cmd: 'metaKey', command: 'metaKey'
};

const nonTextInputs = ['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit'];

export type Alignment = 'north-west' | 'north-east' | 'south-west' | 'south-east';

export type ContextifyClickEvent = {
    handled: boolean;
    parent: Contextify | null;
} & (
    | { hotkey?: undefined; button: HTMLDivElement }
    | { hotkey: string; button: HTMLDivElement | null }
);

export interface ContextifyButton {
    type?: 'button' | 'separator';
    text?: string;
    icon?: string | Element;
    hotkey?: string;
    hotkeyLabel?: string | false;
    requireMenuOpen?: boolean;
    colour?: string;
    textcolour?: string;
    enabled?: boolean;
    click?: (event: ContextifyClickEvent) => void;
    child?: ContextifyButton[];
}

/**
 * A JavaScript lib to override the basic browser context menu.
 * Passing in the parent object will allow you to specify which objects
 * on the webpage will have this custom context menu, either assigning it
 * to `document.body` or leaving it undefined will completely override the
 * default context menu for the entire page. Allows for the buttons to be
 * defined in a JSON format for maximum customization.
 * This library was created as an alternative to the many preexisting ones
 * but taking large inspiration from those that exist. This exists merely to
 * be an all in one solution with all of the features that I required for my
 * own personal projects. See the following for the inspiration and some
 * badass alternatives to this lib:
 * https://github.com/UnrealSecurity/context-js
 * https://github.com/m-thalmann/contextmenujs
 * https://github.com/astronphp/context.js
 *
 * @author Jacob 'Jacoobia' Hampton
 * @git https://github.com/jacoobia
 */
export default class Contextify {

    container: HTMLElement;
    parent: Contextify | null;
    active: boolean;
    focused: boolean;
    root: boolean;
    buttons: ContextifyButton[];
    children: Contextify[];
    childMenus: Map<ContextifyButton, Contextify>;
    entries: Map<ContextifyButton, HTMLDivElement>;
    theme: string;
    themePath: string;
    alignment: Alignment;
    link?: HTMLLinkElement;
    menu!: HTMLDivElement;
    leaveTimeout?: ReturnType<typeof setTimeout>;
    contextEvent!: (event: MouseEvent) => void;
    clickEvent!: (event: MouseEvent) => void;
    mouseLeave!: (event: MouseEvent) => void;
    mouseEnter!: (event: MouseEvent) => void;
    keyPressedEvent!: (event: KeyboardEvent) => void;

    /**
     * Takes in the parent div which controls where you can
     * right click to activate the contextify menu. Also takes
     * in an array of json formatted buttons with a bunch of
     * different optional params.
     * Out of the box it will register the events for you, but
     * if you are to deregister the events for whatever reason
     * do not forget to call the register function once again.
     * @param buttons the button JSON definition
     * @param theme the theme to use, dark or light
     * @param container @optional the parent div
     * @param alignment @optional the orientation of parent
     * @param parent the parent object, only defined for submenus
     */
    constructor(buttons: ContextifyButton[], theme: string, container: HTMLElement = document.body, alignment: Alignment = 'south-east', themePath = 'themes/') {
        this.container = container;
        this.parent = null;
        this.active = false;
        this.focused = false;
        this.root = true;
        this.buttons = buttons;
        this.children = [];
        this.childMenus = new Map();
        this.entries = new Map();
        this.theme = theme;
        this.themePath = themePath;
        this.alignment = alignment;

        this.assignTheme(theme);
        for (const button of buttons) {
            if (this.hasAttribute(button, childAttribute))
                this.getChildMenu(button);
        }
        this.constructEvents();
        this.register();
    }

    /**
     * Loads the associated CSS depending on what theme was
     * selected for the menu.
     * To add new themes simply make a CSS file named
     * contextify-{name}-.css and add that name to the constructor
     * call for the Contextify object.
     */
    assignTheme(theme: string, themePath = this.themePath) {
        if (this.link !== undefined) {
            document.getElementsByTagName('head')[0].removeChild(this.link);
        }
        this.link = document.createElement('link');
        this.link.rel = 'stylesheet';
        this.link.type = 'text/css';
        this.link.href = themePath + 'contextify-' + theme + '.css';
        document.getElementsByTagName('HEAD')[0].appendChild(this.link);
    }

    /**
     * Construct the evens and package them into objects in memory
     * for the registry methods to access on the fly.
     */
    constructEvents() {

        /**
         * The context menu event used to overwrite the current
         * @param {*} event
         * @returns
         */
        this.contextEvent = event => {
            event.preventDefault();
            if (this.root && event.target !== this.menu) {
                for (const child of this.children) {
                    if (event.target === child.menu)
                        return;
                }
                this.show(event.clientX, event.clientY);
            }
        }

        /**
         * Checks if anything but a menu is clicked, if so we want to close
         * the root menu this closing each of the children too.
         * @param {*} event
         */
        this.clickEvent = event => {
            if (this.root) {
                if (this.menu !== undefined) {
                    if (!this.menuEntryMember(event.target as HTMLElement)) {
                        this.hide(false);
                    }
                    else event.preventDefault();
                }
            }
        }

        /**
         * The mouse leave event is used to disable the focused state for a menu
         * and also to ensure that we close any menus that aren't focused and
         * either don't have an active child menu or they do but that also isn't
         * focused.
         * We don't want this to close the root menu since we only want the
         * cancel button to close the root menu or to click away from the menu.
         * This is set on a timeout for half a second so that we can ensure any
         * other menus get set as focused before the current one is unfocused
         * allowing the user to use submenus.
         * @param {*} event the *unused* event data
         */
        this.mouseLeave = event => {
            this.leaveTimeout = setTimeout(() => {
                this.focused = false;
                if (!this.root) {
                    if (this.hasActiveChild() && !this.getActiveChild()!.focused) {
                        this.hide(false);
                    } else if (!this.hasActiveChild()) {
                        this.hide(false);
                        if (!this.parent!.root && !this.parent!.focused)
                            this.parent!.hide(false);
                    }
                } else {
                    if (this.hasActiveChild()) {
                        const child = this.getActiveChild()!;
                        if (!child.focused)
                            child.hide(false);
                    }
                }
            }, childTimeout);
        }

        /**
         * Toggled the focus state to true for a menu the second the event
         * is fired.
         * @param {*} event
         */
        this.mouseEnter = event => {
            this.focused = true;
            if (this.leaveTimeout !== undefined)
                clearTimeout(this.leaveTimeout);
        }

        this.keyPressedEvent = event => {
            let root: Contextify = this;
            while (root.parent !== null)
                root = root.parent;
            if (!root.active && !this.container.contains(event.target as Node))
                return;
            if (this.isTextField(event.target) && !event.ctrlKey && !event.altKey && !event.metaKey)
                return;
            for (const button of this.buttons) {
                const click = button[clickAttribute];
                const hotkey = button[hotkeyAttribute];
                if (typeof click !== 'function' || hotkey === undefined || button[enabledAttribute] === false)
                    continue;
                if (button.requireMenuOpen && !root.active)
                    continue;
                if (this.matchesHotkey(hotkey, event)) {
                    event.preventDefault();
                    const menuEntry = this.active ? this.entries.get(button) : undefined;
                    click({ handled: false, button: menuEntry ?? null, parent: this.parent, hotkey });
                    return;
                }
            }
        }
    }

    /**
     * Builds the context menu on demand. Loops through the JSON style data
     * for the buttons one by one, parses them and appends them as a child
     * div to the menu div.
     * We construct on demand rather than recycling the menu so we don't have
     * to worry about calling .show() or .hide() for every child objected of
     * the menu.
     */
    constructMenu() {
        this.menu = document.createElement('div');
        this.menu.classList.add('context');
        this.entries.clear();
        for (const button of this.buttons)
            this.menu.appendChild(this.parseButtonData(button));
        this.container.appendChild(this.menu);
        this.menu.addEventListener(mouseLeaveEvent, this.mouseLeave);
        this.menu.addEventListener(mouseEnterEvent, this.mouseEnter);
    }

    /**
     * Parse the JSON style data into a button with custom events
     * and custom data.
     * @param button the button data to parse
     */
    parseButtonData(button: ContextifyButton) {
        const menuEntry = document.createElement('div');
        menuEntry.classList.add('menuEntry');

        const type = this.hasAttribute(button, typeAttribute) ? button[typeAttribute] : 'button';
        if ('separator' === type) {
            menuEntry.classList.add('separator');
            return menuEntry;
        }
        this.entries.set(button, menuEntry);

        if (this.hasAttribute(button, childAttribute)) {
            this.buildChildMenu(menuEntry, button);
        } else {
            const closeSubMeu = (event: MouseEvent) => {
                for (const child of this.children) {
                    if (child.active) {
                        child.hide(false);
                    }
                }
            }
            menuEntry.addEventListener(mouseEnterEvent, closeSubMeu);
        }

        menuEntry.classList.add('contextButton');

        if (this.hasAttribute(button, colourAttribute)) {
            if (this.validateColourCode(button[colourAttribute]!)) {
                let rgba = this.translateColourCodes(button[colourAttribute]!.toString());
                menuEntry.style.cssText = `background-color: ${rgba}`;
            }
        }

        if (this.hasAttribute(button, textColourAttribute)) {
            if (this.validateColourCode(button[textColourAttribute]!)) {
                let rgba = this.translateColourCodes(button[textColourAttribute]!.toString());
                menuEntry.style.cssText = `color: ${rgba}`;
            }
        }

        this.appendLabelAndIcon(button, menuEntry, button[textAttribute]!.toString());
        menuEntry.id = button[textAttribute]!;



        if (this.hasAttribute(button, enabledAttribute)) {
            menuEntry.classList.add(button[enabledAttribute] ? enabledAttribute : 'disabled');
        }

        if (this.hasAttribute(button, clickAttribute)) {
            if (typeof button[clickAttribute] === 'function') {
                this.assignClickHandler(button, menuEntry, this.parent, button[clickAttribute]);
            }
        }

        return menuEntry;
    }

    /**
     * Parses menu data for a child menu and assigns the new menu to
     * open when the corresponding menu button icon on the parent
     * menu is hovered over.
     * @param menuEntry the menu button responsible for the child menu
     * @param button the button data to parse for the child menu
     */
    buildChildMenu(menuEntry: HTMLDivElement, button: ContextifyButton) {
        const childMenu = this.getChildMenu(button);
        const openSubMenu = (event: MouseEvent) => {
            if (button[enabledAttribute] === undefined || button[enabledAttribute]) {
                let x = this.menu.offsetLeft + this.menu.clientWidth + menuEntry.offsetLeft;
                let y = this.menu.offsetTop + menuEntry.offsetTop;
                if (!childMenu.active) {
                    childMenu.show(x, y);
                }
                else childMenu.hide(false);
            }
        }

        menuEntry.addEventListener(mouseEnterEvent, openSubMenu);
    }

    getChildMenu(button: ContextifyButton): Contextify {
        let childMenu = this.childMenus.get(button);
        if (childMenu === undefined) {
            childMenu = new Contextify(button[childAttribute]!, this.theme, this.container, undefined, this.themePath);
            childMenu.parent = this;
            childMenu.root = false;
            this.childMenus.set(button, childMenu);
            this.children.push(childMenu);
        }
        return childMenu;
    }

    isTextField(target: EventTarget | null): boolean {
        if (target instanceof HTMLInputElement)
            return !nonTextInputs.includes(target.type);
        return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement ||
            (target instanceof HTMLElement && target.isContentEditable);
    }

    matchesHotkey(hotkey: string, event: KeyboardEvent): boolean {
        const keys = hotkey.toLowerCase().split(' + ');
        const key = keys.pop()!;
        for (const property of ['ctrlKey', 'altKey', 'shiftKey', 'metaKey'] as const) {
            if (event[property] !== keys.some(name => modifierKeys[name] === property))
                return false;
        }
        const code = event.code.toLowerCase();
        return event.key.toLowerCase() === key || code === 'key' + key || code === 'digit' + key;
    }

    /**
     * Assigns the click functionality to a specific button,
     * in the form of a function to call when clicked.
     * @param button the button data to check for the hotkey attribute
     * @param menuEntry the menu button to give functionality to
     * @param parent the parent object of the menu button
     * @param func the function to call when the button is clicked
     */
    assignClickHandler(button: ContextifyButton, menuEntry: HTMLDivElement, parent: Contextify | null, func: (event: ContextifyClickEvent) => void) {
        menuEntry.addEventListener(clickAttribute, function () {
            func({ handled: false, button: menuEntry, parent: parent });
        });

        const hotkeyName = button[hotkeyLabelAttribute] ?? button[hotkeyAttribute];
        if (hotkeyName) {
            const hotkey = document.createElement('span');
            hotkey.classList.add(hotkeyAttribute);
            hotkey.innerText = hotkeyName;
            menuEntry.appendChild(hotkey);
        }
    }

    /**
     * Checks if the JSON for a button has an attribute of a
     * given name
     * @param button the button data to check
     * @param attribute the attribute to look for
     * @returns {boolean} is the attribute present
     */
    hasAttribute(button: ContextifyButton, attribute: keyof ContextifyButton): boolean {
        return button.hasOwnProperty(attribute);
    }

    /**
     * Use regex to validate that the rgba colour attribute
     * is set correctly. If not then we won't assign the
     * colour to the object and will throw a console error.
     * @param colour the string colour attribute to validate
     * @returns {boolean} did the attribute pass validation
     */
    validateColourCode(colour: string): boolean {
        let splitColour = colour.split(':');
        for (let i = 0; i < 3; i++) {
            if (!/^(([0-1]?[0-9]?[0-9])|([2][0-4][0-9])|(25[0-5]))$/i.exec(splitColour[i])) {
                console.error("[Contextify]: Invalid rgba colour attribute format. Please use format: 255:255:255:1.0");
                return false;
            }
        }
        if (!/^(0(\.\d+)?|1(\.0+)?)$/i.exec(splitColour[3])) {
            console.error("[Contextify]: Invalid rgba colour attribute format. Please use format: 255:255:255:1.0");
            return false;
        }
        return true;
    }

    /**
     * Appends a label and an (if valid) an icon to a parent object.
     * @param button the button data
     * @param parent the parent object
     * @param text the text for the label
     */
    appendLabelAndIcon(button: ContextifyButton, parent: HTMLElement, text: string | undefined) {
        if (this.hasAttribute(button, iconAttribute)) {
            const icon = document.createElement('span');
            const iconData = button[iconAttribute]!;
            if (typeof iconData === 'string')
                icon.classList.add(...iconData.split(/\s+/).filter(Boolean));
            else icon.appendChild(iconData.cloneNode(true));
            icon.classList.add(iconAttribute);
            parent.appendChild(icon);
        }

        const label = document.createElement('span');
        label.classList.add('label');
        label.innerText = text === undefined ? '' : text;
        parent.appendChild(label);
    }

    /**
     * Show the context menu at a particular X, Y coordinate
     * position on the screen, by default this will be called
     * whenever the user right clicks the parent and it will
     * open the menu at the users cursor position.
     * This can also be called to show the menu at different
     * places on the screen from a button click etc.
     * @param x the x position
     * @param y the y position
     */
    show(x: number, y: number) {
        if (this.active) this.hide(false);
        this.constructMenu();

        let scrollLeftValue		    = document.documentElement.scrollLeft;
        let scrollTopValue		    = document.documentElement.scrollTop;
        let window_total_width		= window.innerWidth + scrollLeftValue;
        let window_total_height		= window.innerHeight + scrollTopValue;

        let context_width   = this.menu.offsetWidth;
        let context_height  = this.menu.offsetHeight;

        if (this.parent === null) {
            switch (this.alignment) {
                case 'north-west':
                    x += (-1 * context_width);
                    y += (-1 * context_height);
                    break;
                case 'north-east':
                    y += (-1 * context_height);
                    break;
                case 'south-west':
                    x += (-1 * context_width);
                    break;
                case 'south-east':
                default:
                    /* nothing to change */
            }
        }

        if ((x + context_width) > window_total_width) {
            x += (-1 * context_width);
            if (this.parent !== null) {
                x += (-1 * this.parent.menu.offsetWidth);
            }
        }

        if ((y + context_height) > window_total_height) {
            y += (-1 * context_height);
        }

        /* fallback to zero if start point is left or above out of range */
        if (y < 0) {
            y = 0;
        }
        if (x < 0) {
            x = 0;
        }

        this.setPosition(x, y);
        this.active = true;
    }

    /**
     * Hides the menu by setting the active state to false and
     * removing each of the child components including the children
     * context menu objects.
     */
    hide(hideParent?: boolean) {
        if (this.active) {
            this.active = false;
            this.hideChildren();
            this.container.removeChild(this.menu);

            if (hideParent && this.parent !== null && this.parent.active) {
                this.parent.hide(false);
            }
        }
    }

    /**
     * Systematically hides the child menus of a
     * given menu with the false param so that the
     * child object does not try to disable its
     * parent oject also.
     */
    hideChildren() {
        for (const child of this.children) {
            if (child.active) {
                child.hide(false);
            }
        }
    }

    /**
     * Checks if a menu has a currently active child menu
     * @returns if a menu has an active child
     */
    hasActiveChild(): boolean {
        return this.getActiveChild() !== null;
    }

    /**
     * Gets the first active child from the
     * array of children for a menu.
     * @returns null or Contextify child object
     */
    getActiveChild(): Contextify | null {
        if (this.children !== undefined) {
            for (const child of this.children) {
                if (child.active)
                    return child;
            }
        }
        return null;
    }

    /**
     * Sets the position of the main context menu body
     * based on screen viewport coordinates in pixels.
     * Centered around the top left of the menu.
     * @param x the x position to set
     * @param y the y position to set
     */
    setPosition(x: number, y: number) {
        this.menu.style.left = `${x}px`;
        this.menu.style.top = `${y}px`;
    }

    /**
     * Disable a button with a certain ID, the ID refers to the
     * actual text of the button.
     * @param button the button to disable
     */
    disableButton(button: string) {
        this.container.querySelector(button)!.classList.remove('enabled');
        this.container.querySelector(button)!.classList.add('disabled');
    }

    /**
     * Enable a button with a certain ID, the ID refers to the
     * actual text of the button.
     * @param button the button to enable
     */
    enableButton(button: string) {
        this.container.querySelector(button)!.classList.remove('disabled');
        this.container.querySelector(button)!.classList.add('enabled');
    }

    /**
     * Translates inline colour codes for the button data,
     * in RGBA format, for example color: '255:0:0:1' would
     * be red and 100% opaque
     * @param code the colour code to translate
     */
    translateColourCodes(code: string): string {
        let split = code.split(':');
        return 'rgba(' + split[0] + ',' + split[1] + ',' + split[2] + ',' + split[3] + ')';
    }

    /**
     * Checks if a page element/an object is a member of a
     * menu or menu entry
     * @param obj the object to check
     * @returns bool is the object a member of a menu
     */
    menuEntryMember(obj: HTMLElement): boolean {
        return (obj.classList.contains('menuEntry') ||
            obj.parentElement!.classList.contains('menuEntry'));
    }

    /**
     * Register all of the events.
     * Public to allow the ability to enable and disable the menu on the fly.
     */
    register() {
        this.container.addEventListener(contextEvent, this.contextEvent);
        document.addEventListener(keyPressEvent, this.keyPressedEvent);
        this.container.addEventListener(mouseClickEvent, this.clickEvent);
        for (const child of this.children)
            child.register();
    }

    /**
     * Deregister all of the events.
     * Public to allow the ability to enable and disable the menu on the fly.
     */
    deregister() {
        this.container.removeEventListener(contextEvent, this.contextEvent);
        document.removeEventListener(keyPressEvent, this.keyPressedEvent);
        this.container.removeEventListener(mouseClickEvent, this.clickEvent);
        for (const child of this.children)
            child.deregister();
    }

}
