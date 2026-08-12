--- a/app.js
@@ -10,25 +10,7 @@
     render() {
         return (
-            <div style={{ backgroundColor: 'blue', color: 'white', padding: '10px' }}>
-                <h1>Welcome to My App</h1>
-                <p>This is a paragraph.</p>
-            </div>
+            <div className="app-container">
+                <h1>Welcome to My App</h1>
+                <p>This is a paragraph.</p>
+            </div>
         );
     }
 }

-export default class App extends React.Component {
-    render() {
-        return (
-            <div style={{ backgroundColor: 'blue', color: 'white', padding: '10px' }}>
-                <h1>Welcome to My App</h1>
-                <p>This is a paragraph.</p>
-            </div>
-        );
-    }
-}
-
-export default App;
