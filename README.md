A custom editor for ULTRAKILL .cgp files with a 3D viewport. You can actually see what you're working on!

I will probably be updating this occasionally to bugfix, add functions / features, clean up the UI, etc. It's likely that this program will vary wildly between major updates.



# Installing

Download and unzip any release package, x64 recommended. 

This program is currently portable, so extract it anywhere you like! Location won't affect anything.





## TODO
(in no particular order)

- Make stairs appear in the viewport instead of just replacing a texture
- Main menu
- Clean UI
- Ease vertical camera movement
- Render in a worker thread
- Rectangular selections
- Custom tile colors
- Allow changing ULTRAKILL install path



# Dependencies

- [NW.js](https://nwjs.io/downloads/) - Runtime
- [Node.js](https://nodejs.org/en/) - For NPM



# Running from source code

All you need to run the app directly from the source code is NW.js. NPM is only used to install the building/packaging tool `nw-builder-phoenix`.

Simply run `nw .` at the root of the project.



# Building

I expect you know what these commands do.

```
npm install
npm run dist
```
