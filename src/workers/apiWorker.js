self.onmessage = async (e) => {
  const { url } = e.data;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    self.postMessage({ success: true, data });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
