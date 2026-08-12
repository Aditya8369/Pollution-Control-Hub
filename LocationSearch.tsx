--- a/LocationSearch.tsx
@@ -10,7 +10,6 @@ const LocationSearch: React.FC = () => {
   const [searchTerm, setSearchTerm] = useState('');
   const [results, setResults] = useState<Location[]>([]);
 
-  if (shouldFetch) {
     useEffect(() => {
       // Fetch locations based on searchTerm
       fetchLocations(searchTerm).then(data => {
@@ -20,7 +19,6 @@ const LocationSearch: React.FC = () => {
         setResults(data);
       });
     }, [searchTerm]);
-  }
 
   return (
     <div>
       <input
