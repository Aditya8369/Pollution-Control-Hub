--- a/apps/cli/main.py
@@ -10,6 +10,7 @@ import click
 from .service import analyze_data
 
 cache = {}
+
 @click.command()
 @click.option('--data', required=True)
 def cli(data):
@@ -20,7 +21,9 @@ def cli(data):
     result = analyze_data(data)
     print(result)
 
+    # Check if the result is already cached
+    if data not in cache:
+        cache[data] = result
 
-    result = analyze_data(data)
     click.echo(f"Analysis complete: {result}")
