const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'react-native-css-interop', 'babel.js');

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('"react-native-worklets/plugin",', '');
  content = content.replace('"react-native-worklets/plugin"', '');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully patched react-native-css-interop/babel.js');
} else {
  console.log('react-native-css-interop/babel.js not found, skipping patch.');
}
