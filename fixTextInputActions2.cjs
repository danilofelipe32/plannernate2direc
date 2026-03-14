const fs = require('fs');

let out = fs.readFileSync('src/App.tsx', 'utf8');

// Find all missing currentValues
const settersToPatch = [
  'setNewTaskTitle',
  'setNewTaskDescription',
  'setNewTaskCategory', // if has
  'setNewCommentText',
  'setNewEventTitle',
  'setPlanningGoal',
  'setPlanningSpecificGoals',
  'setPlanningActions',
  'setPlanningMethodology',
  'setNewNoteTitle',
  'setNewNoteContent'
];

settersToPatch.forEach(setter => {
  const searchStr = `onGenerate={${setter}}`;
  let index = 0;
  while (true) {
    index = out.indexOf(searchStr, index);
    if (index === -1) break;
    
    // Check if currentValue is already there
    const end = out.indexOf('/>', index);
    if (end !== -1) {
      const insideTag = out.slice(index, end);
      if (!insideTag.includes('currentValue=')) {
        const stateVar = setter.charAt(3).toLowerCase() + setter.slice(4); 
        // Example: setNewTaskTitle -> newTaskTitle
        out = out.slice(0, end) + ` currentValue={${stateVar}}\n                            />` + out.slice(end + 2);
      }
    }
    index += searchStr.length;
  }
});

fs.writeFileSync('src/App.tsx', out, 'utf8');
console.log('App.tsx missing currentValues successfully patched!');
