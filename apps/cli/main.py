--- a/apps/cli/main.py
@@ -10,6 +10,7 @@
 import argparse
 from apps.core.config import load_config
 from apps.services.user_service import UserService
+from apps.services.reducer import ReducerService
 
 def main():
     parser = argparse.ArgumentParser(description="CLI Application")
@@ -23,6 +24,8 @@ def main():
     args = parser.parse_args()
 
     config = load_config()
+    reducer = ReducerService(config)
+
     if args.subcommand == "create":
         user_service = UserService(config)
         user_service.create_user(args.name, args.email)
@@ -31,6 +34,8 @@ def main():
         user_service.delete_user(args.user_id)
 
     elif args.subcommand == "list":
+        state = reducer.get_current_state()
         user_service = UserService(config)
-        users = user_service.list_users()
+        users = user_service.list_users(state)
         for user in users:
             print(user)
