import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const sourceFiles = project.getSourceFiles();

sourceFiles.forEach(sourceFile => {
  let changed = false;

  // For React components, sometimes the destructuring param needs a type.
  const functions = [
    ...sourceFile.getFunctions(),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration),
  ];

  for (const func of functions) {
    const params = func.getParameters();
    let needsJSDoc = false;
    let jsdocTags = [];

    params.forEach(param => {
      // If no explicit type node and no JSDoc type, it is implicit any in strict mode
      if (!param.getTypeNode()) {
        needsJSDoc = true;
        let paramName = param.getName();
        if (paramName.includes('{') || paramName.includes('[')) {
          // Destructured parameter, JSDoc needs a name, let's just use a dummy or skip
          paramName = 'params';
        }
        jsdocTags.push({ tagName: 'param', text: `{any} ${paramName}` });
      }
    });

    if (needsJSDoc) {
      if (func.getKind() === SyntaxKind.FunctionDeclaration || func.getKind() === SyntaxKind.MethodDeclaration) {
        if (func.getJsDocs().length === 0) {
          func.addJsDoc({ tags: jsdocTags });
          changed = true;
        }
      } else if (func.getKind() === SyntaxKind.ArrowFunction || func.getKind() === SyntaxKind.FunctionExpression) {
        const parent = func.getParentIfKind(SyntaxKind.VariableDeclaration);
        if (parent) {
          const statement = parent.getParentIfKind(SyntaxKind.VariableDeclarationList)?.getParentIfKind(SyntaxKind.VariableStatement);
          if (statement && statement.getJsDocs().length === 0) {
            statement.addJsDoc({ tags: jsdocTags });
            changed = true;
          }
        }
      }
    }
  }
  
  // Implicit any variables
  const variables = sourceFile.getVariableDeclarations();
  for (const v of variables) {
      if (v.getType().isAny() && !v.getTypeNode()) {
          const statement = v.getParentIfKind(SyntaxKind.VariableDeclarationList)?.getParentIfKind(SyntaxKind.VariableStatement);
          if (statement && statement.getJsDocs().length === 0) {
              // Only add if not a function
              const initializer = v.getInitializer();
              if (initializer && !initializer.isKind(SyntaxKind.ArrowFunction) && !initializer.isKind(SyntaxKind.FunctionExpression)) {
                  statement.addJsDoc({ tags: [{ tagName: "type", text: "{any}" }] });
                  changed = true;
              }
          }
      }
  }

  if (changed) {
    sourceFile.saveSync();
  }
});

console.log("JSDoc added.");
