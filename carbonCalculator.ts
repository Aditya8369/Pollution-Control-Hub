--- a/carbonCalculator.ts
@@ -10,6 +10,9 @@
     }
 
     // Calculate carbon footprint based on input data
-    const carbonFootprint = calculateCarbon(input);
+    if (input === null || input === undefined) {
+      throw new Error('Input cannot be null or undefined');
+    }
+    const carbonFootprint = calculateCarbon(input);
 
     return carbonFootprint;
   }
