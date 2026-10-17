Source: https://github.com/AneesDEV0/dawwer-map
Revision: 81d8fe3e238bed0820540bbdcee1cb83d1feda6b

Integrated editor with authenticated merchant page, live store catalog, empty store initialization and store-specific local persistence. Local edits: app.js, index.html, shopper.js. context.js is the integration adapter. theme.js synchronizes the parent theme; theme.css applies Dawwer light/dark design tokens to the editor and shopper preview. Map geometry and shelf placements are saved on this browser only; they are not published to the backend.
