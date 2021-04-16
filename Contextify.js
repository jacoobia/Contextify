const contextEventId = 'contextmenu';
const keyEventId = 'keydown';
const mouseClick = 'mousedown';
const clickEvent = 'click';

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
 * 
 * 
 * todo: add icon library functionality
 */
class Contextify {

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
     * @param parent @optional the parent div
     */
    constructor(buttons, theme, parent) {
        this.parent = (typeof parent === "undefined") ? document.body : parent;
        this.active = false;
        this.buttons = buttons;
        this.childMenus = [];

        this.assignTheme(theme);
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
    assignTheme(theme) {
        if (this.link !== undefined) {
            document.getElementsByTagName('head')[0].removeChild(this.link);
        }
        this.link = document.createElement('link');
        this.link.rel = 'stylesheet';
        this.link.type = 'text/css';
        this.link.href = 'css/contextify-' + theme + '.css';
        document.getElementsByTagName('HEAD')[0].appendChild(this.link);
    }

    /**
     * Construct the evens and package them into objects in memory
     * for the registry methods to access on the fly.
     */
    constructEvents() {
        this.contextEvent = event => {
            event.preventDefault();
            this.show(event.clientX, event.clientY);
        }
        this.keyEvent = event => {
            event.preventDefault();
            //alert(event.keyCode);
        }
        this.clickEvent = event => {
            event.preventDefault();
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
        for (const button of this.buttons)
            this.menu.appendChild(this.parseButtonData(button));
        this.parent.appendChild(this.menu);
    }

    /**
     * Parse the JSON style data into a button with custom events
     * and custom data.
     * @param button the button data to parse
     */
    parseButtonData(button) {
        const menuEntry = document.createElement('div');

        let type = this.hasAttribute(button, 'type') ? button['type'] : 'button';
        if ('separator' === type) {
            menuEntry.classList.add('separator');
            return menuEntry;
        }

        menuEntry.classList.add('contextButton');

        if (this.hasAttribute(button, 'colour')) {
            if (this.validateColourCode(button['colour'])) {
                let rgba = this.translateColourCodes(button['colour'].toString());
                menuEntry.style.cssText = `background-color: ${rgba}`;
            }
        }

        if (this.hasAttribute(button, 'textcolour')) {
            if (this.validateColourCode(button['textcolour'])) {
                let rgba = this.translateColourCodes(button['textcolour'].toString());
                menuEntry.style.cssText = `color: ${rgba}`;
            }
        }

        this.appendLabelAndIcon(button, menuEntry, button['text'].toString());
        menuEntry.id = button['text'];



        if (this.hasAttribute(button, 'enabled')) {
            menuEntry.classList.add(button['enabled'] ? 'enabled' : 'disabled');
        }

        if (this.hasAttribute(button, clickEvent)) {
            if (typeof button[clickEvent] === 'function') {
                this.assignClickHandler(menuEntry, button[clickEvent]);
            }
        }

        if (this.hasAttribute(button, 'hotkey')) {
            const hotkey = document.createElement('span');
            hotkey.classList.add('hotkey');
            hotkey.innerText = button['hotkey'];
            menuEntry.appendChild(hotkey);
        }

        /*        if(this.hasAttribute(button, 'child')) {
                    let child = button['child'];
                    if(child instanceof Contextify) {
                        
                    }
                }*/

        return menuEntry;
    }

    buildChildMenu(parent) {

    }

    /**
     * Assigns the click functionality to a specific button,
     * in the form of a function to call when clicked.
     * @param menuEntry the menu button to give functionality to
     * @param func the function to call when the button is clicked
     */
    assignClickHandler(menuEntry, func) {
        menuEntry.addEventListener(clickEvent, function () {
            func({ handled: false, button: menuEntry });
        });
    }

    /**
     * Checks if the JSON for a button has an attribute of a
     * given name
     * @param button the button data to check
     * @param attribute the attribute to look for
     * @returns {boolean} is the attribute present
     */
    hasAttribute(button, attribute) {
        return button.hasOwnProperty(attribute);
    }

    /**
     * Use regex to validate that the rgba colour attribute
     * is set correctly. If not then we won't assign the
     * colour to the object and will throw a console error.
     * @param colour the string colour attribute to validate
     * @returns {boolean} did the attribute pass validation
     */
    validateColourCode(colour) {
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
    appendLabelAndIcon(button, parent, text) {
        if (this.hasAttribute(button, 'icon')) {
            if (this.validateFontAwesome()) {
                const icon = document.createElement('span');
                icon.classList.add('fa');
                icon.classList.add(button['icon']);
                icon.classList.add('icon');
                parent.appendChild(icon);
            }
            else console.warn('Warning: Use of icons requires fontawesome. Icons will not load.');
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
    show(x, y) {
        if (this.active) this.hide();
        this.constructMenu();
        this.setPosition(x, y);
        this.active = true;
    }

    /**
     * Hides the menu by setting the active state to false and
     * removing each of the child components including the children
     * context menu objects.
     */
    hide() {
        this.active = false;
        this.parent.removeChild(this.menu);
    }

    /**
     * Sets the position of the main context menu body
     * based on screen viewport coordinates in pixels.
     * Centered around the top left of the menu.
     * @param x the x position to set
     * @param y the y position to set
     */
    setPosition(x, y) {
        this.menu.style.left = `${x}px`;
        this.menu.style.top = `${y}px`;
    }

    /**
     * Disable a button with a certain ID, the ID refers to the
     * actual text of the button.
     * @param button the button to disable
     */
    disableButton(button) {
        this.parent.querySelector(button).classList.remove('enabled');
        this.parent.querySelector(button).classList.add('disabled');
    }

    /**
     * Enable a button with a certain ID, the ID refers to the
     * actual text of the button.
     * @param button the button to enable
     */
    enableButton(button) {
        this.parent.querySelector(button).classList.remove('disabled');
        this.parent.querySelector(button).classList.add('enabled');
    }

    /**
     * Translates inline colour codes for the button data,
     * in RGBA format, for example color: '255:0:0:1' would
     * be red and 100% opaque
     * @param code the colour code to translate
     */
    translateColourCodes(code) {
        let split = code.split(':');
        return 'rgba(' + split[0] + ',' + split[1] + ',' + split[2] + ',' + split[3] + ')';
    }

    /**
     * Checks to see if fontawesome css is included in the project,
     * or if a webkit js implementation is included in the project.
     * Only called when the icon attribute is used otherwise it will
     * just skip over validation. 
     * 
     * https://stackoverflow.com/a/38703452/15552579
     * 
     * @returns True if the css is present, false if not
     */
    validateFontAwesome() {
        var span = document.createElement('span');

        span.className = 'fa';
        span.style.display = 'none';
        document.body.insertBefore(span, document.body.firstChild);

        function css(element, property) {
            return window.getComputedStyle(element, null).getPropertyValue(property);
        }

        let cdnExists = css(span, 'font-family').toLowerCase() === 'fontawesome';
        let jsExists = window.FontAwesomeKitConfig !== undefined;
        document.body.removeChild(span);
        return cdnExists || jsExists;
    }

    /**
     * Register all of the events.
     * Public to allow the ability to enable and disable the menu on the fly.
     */
    register() {
        this.parent.addEventListener(contextEventId, this.contextEvent);
        //this.parent.addEventListener(keyEventId, this.keyEvent);
        this.parent.addEventListener(mouseClick, this.clickEvent);
    }

    /**
     * Deregister all of the events.
     * Public to allow the ability to enable and disable the menu on the fly.
     */
    deregister() {
        this.parent.removeEventListener(contextEventId, this.contextEvent);
        //this.parent.removeEventListener(keyEventId, this.keyEvent);
        this.parent.removeEventListener(mouseClick, this.clickEvent);
    }

}