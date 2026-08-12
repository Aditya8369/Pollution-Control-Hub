--- a/src/components/LocationSearch.tsx
@@ -20,7 +20,6 @@ import { useLocation } from 'react-router-dom';
 import { debounce } from 'lodash';

 const LocationSearch: React.FC = () => {
-  const [searchTerm, setSearchTerm] = useState('');
   const navigate = useNavigate();

   const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
@@ -29,6 +28,7 @@ const LocationSearch: React.FC = () => {
     setSearchTerm(event.target.value);
     debouncedSearch();
   };

+  const [searchTerm, setSearchTerm] = useState('');

   return (
     <div>
       <input
         type="text"

+--- a/src/components/LocationSearch.tsx
+@@ -10,7 +10,7 @@ import React from 'react';
+ 
+ const LocationSearch: React.FC = () => {
+   // Call to useEffect inside functional component
+-  useEffect(() => {
++  React.useEffect(() => {
+     // Effect logic here
+   }, []);
+ 
+   return (
+     <div>
+       {/* Component JSX */}
+     </div>
+   );
+ };