import { createApp } from "./app.js";

const PORT = process.env.PORT || 5175;

const app = createApp();
app.listen(PORT, () => {
  console.log(`Pollution Control Hub API listening on http://localhost:${PORT}`);
});
