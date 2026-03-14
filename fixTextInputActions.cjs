const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Clean up duplicated 'context=...' from the previous failed replacements
content = content.replace(/(context={`Escola: \${projectSchoolName}\\nMunicípio:.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?}`\} )+/g, '');
content = content.replace(/(context={`Escola: \${projectSchoolName}\\nMunicípio:.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?}`\} \/>)+/g, '/>');
content = content.replace(/context=\{`Escola: \${projectSchoolName}\\nMunicípio: \${projectMunicipality}\\nProjeto: \${projectName}\\nProfessor: \${projectTeacherName}\\nContato: \${projectContact}\\nÁrea: \${projectArea}\\nPúblico: \${projectTargetAudience}\\nObjetivo: \${projectObjective}\\nAtividades: \${projectActivities}\\nResultados adicionais: \${projectResultOther}`\}\s*/g, '');

content = content.replace(/currentValue=\{[A-Za-z0-9_]+\}\s*/g, '');

// A better way to match the TextInputActions component in JSX without getting broken by `=>` inside onEdit
// We can find `<TextInputActions` and then find the corresponding `/>` manually.

let out = '';
let pos = 0;
while (true) {
  const start = content.indexOf('<TextInputActions', pos);
  if (start === -1) {
    out += content.slice(pos);
    break;
  }
  
  out += content.slice(pos, start);
  
  // Find the closing '/>'
  // But be careful of nested > or string literals. In our case, TextInputActions is self-closing and has no child elements.
  const end = content.indexOf('/>', start);
  const tagContent = content.slice(start, end + 2);
  
  // Extract the setter name from onGenerate={setXYZ}
  const match = tagContent.match(/onGenerate=\{set([A-Za-z0-9_]+)\}/);
  let newTag = tagContent;
  if (match) {
    const stateVar = match[1].charAt(0).toLowerCase() + match[1].slice(1);
    // Add currentValue prop before />
    newTag = tagContent.replace('/>', ` currentValue={${stateVar}} />`);
  }
  out += newTag;
  pos = end + 2;
}

// Re-apply the project contexts properly
const projectContextStr = 'context={`Escola: ${projectSchoolName}\\nMunicípio: ${projectMunicipality}\\nProjeto: ${projectName}\\nProfessor: ${projectTeacherName}\\nContato: ${projectContact}\\nÁrea: ${projectArea}\\nPúblico: ${projectTargetAudience}\\nObjetivo: ${projectObjective}\\nAtividades: ${projectActivities}\\nResultados adicionais: ${projectResultOther}`}';

const projectSetters = [
  'setProjectSchoolName',
  'setProjectMunicipality',
  'setProjectName',
  'setProjectTeacherName',
  'setProjectContact',
  'setProjectObjective',
  'setProjectActivities',
  'setProjectResultOther',
  'setProjectSubmitterName'
];

projectSetters.forEach(setter => {
  const searchStr = `onGenerate={${setter}}`;
  let index = 0;
  while (true) {
    index = out.indexOf(searchStr, index);
    if (index === -1) break;
    
    // Find where the tag ends
    const end = out.indexOf('/>', index);
    if (end !== -1) {
      // make sure we don't insert it twice
      const insideTag = out.slice(index, end);
      if (!insideTag.includes('context={`Escola:')) {
        out = out.slice(0, end) + `\n                              ${projectContextStr}\n                            />` + out.slice(end + 2);
      }
    }
    index += searchStr.length;
  }
});

fs.writeFileSync('src/App.tsx', out, 'utf8');
console.log('App.tsx successfully cleaned and patched!');
