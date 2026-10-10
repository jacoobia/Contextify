<p float="left>
 <img alt="GitHub Download Count" src="https://img.shields.io/github/downloads/jacoobia/Contextify/total?style=for-the-badge" style="display: inline-block;">
</p>

<br/>

# Contextify

<br/>

A lightweight vanilla JavaScript context menu library with support for any icon library. <br/>
This library was written for use in a personal project of mine as an AIO solution for the features of a context menu that I wanted that I could only find spread across multiple different context menu libraries. This is very early doors and I will continue to maintain this however slowly that may be as I build my personal projects and use cases change or the need for features arise.

# Usage

```
npm install contextify
```

```
    import Contextify from 'contextify';

    //Construct our menu buttons 
    const menuButtons = [
        { icon: 'fa-solid fa-camera', type: 'button', text: 'Screenshot', click: screenshot },
        { icon: 'fa-solid fa-times-circle', type: 'button', text: 'Cancel', click: (event) => { menu.hide(false); }}
    ];
    //Create our new Contextify object with the buttons, theme, container
    const menu = new Contextify(menuButtons, "dark", document.body);
```

Themes are loaded from `themes/` relative to the page by default. If you serve them from elsewhere, pass the folder as the fifth argument:

```
    const menu = new Contextify(menuButtons, "dark", document.body, undefined, "/node_modules/contextify/themes/");
```

Without a bundler, use the browser build, which exposes a global `Contextify`:

```
    <script src="https://unpkg.com/contextify/dist/contextify.global.js"></script>
```

TypeScript types ship with the package (`ContextifyButton`, `ContextifyClickEvent`, `Alignment`).

Icons work with any icon library. Pass the icon's class names as a string, or pass an element such as an inline SVG:

```
    { icon: 'fa-solid fa-camera', text: 'Screenshot' }      // FontAwesome
    { icon: 'bi bi-camera', text: 'Screenshot' }            // Bootstrap Icons
    { icon: mySvgElement, text: 'Screenshot' }              // any Element, cloned into the menu
```

Which creates the following menu (note, the example requires you to have a form of FontAwesome installed):
![Example Menu](https://by3301files.storage.live.com/y4meHtRWf5VBnb5SxLdxHbo-apkdGGw8MCFqGiW-T7sUl7KSlJkkWMDMwZeTXBDCFw7qZqbCUZ58hPljmvqTTxu7mm819PPWu_PpmtJLw-rXW50bzstHEQotokCZgFbU6Wy4lYt2824E7pbUON25EnoqboF1ASE8-c7OwIgUp_8P-HdzcGSOcxR_Lb7K-f5JY2K?width=252&height=84&cropmode=none)

                                                   
Disclaimer: This has only been tested on desktop, MacOS and Windows 10. I have not tested this on any mobile devices.
<img src="https://user-images.githubusercontent.com/15943248/128567733-a9b1c10d-6bcd-4015-ae76-946c58738626.png" width="480" height="300" /> <img src="https://user-images.githubusercontent.com/15943248/128567735-3a9402fe-8b84-46d7-add9-6e63a6ffa5cc.PNG" width="480" height="300" />
