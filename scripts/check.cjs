const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let checked = 0;
for (const name of fs.readdirSync('js').filter(n => n.endsWith('.js'))) {
  new vm.Script(fs.readFileSync(path.join('js', name), 'utf8'), { filename: name }); checked++;
}
for (const name of fs.readdirSync('.').filter(n => n.endsWith('.html'))) {
  const html = fs.readFileSync(name, 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = match[1].match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (src && !/^(https?:)?\/\//.test(src)) {
      if (!fs.existsSync(src.split('?')[0])) throw new Error(`${name}: missing script ${src}`);
    } else if (!src && !/type=["'](?:application\/ld\+json|importmap)/.test(match[1])) {
      new vm.Script(match[2], { filename: `${name}:inline` }); checked++;
    }
  }
}
console.log(`Checked ${checked} JavaScript sources and all local script links.`);
