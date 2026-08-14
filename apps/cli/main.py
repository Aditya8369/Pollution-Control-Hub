--- a/apps/cli/main.py
@@ -30,10 +30,14 @@ def main():
         try:
             # Existing code that may raise an exception
             process_data(data)
-        except Exception as e:
-            print(f"Error: {e}")
-            exit(1)
+        except ErrorToBeHandledInternally as e:
+            log_error(e)  # Log the error internally without user intervention
+        except Exception as e:
+            handle_unexpected_error(e)  # Handle unexpected errors with appropriate measures
+            exit(1)
 
     print("Process completed successfully.")

This patch refines the error handling in `apps/cli/main.py`. It separates internal and external error handling, ensuring that errors requiring user intervention are logged internally without affecting the execution flow. Unexpected errors are handled with appropriate measures before exiting the program.
