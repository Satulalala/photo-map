const fs = require('fs-extra');
const path = require('path');

const cesiumSource = path.join(__dirname, '../node_modules/cesium/Build/Cesium');
const cesiumDest = path.join(__dirname, '../public/cesium');

fs.copySync(cesiumSource, cesiumDest, { overwrite: true });
console.log('Cesium assets copied to public/cesium');
