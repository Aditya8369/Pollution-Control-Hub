--- a/databaseService.ts
@@ -10,7 +10,15 @@ class DatabaseService {
     }
 
     async readData(query: string) {
-        return await this.pool.query(query);
+        try {
+            const result = await this.pool.query(query);
+            if (result.rows.length === 0) {
+                throw new Error("No data found for the given query");
+            }
+            return result;
+        } catch (error) {
+            console.error("Database read error:", error);
+            throw error;
+        }
     }
 
     async insertData(query: string, values: any[]) {
