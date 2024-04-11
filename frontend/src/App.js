import React, { useState } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first!');
      return;
    }

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const response = await fetch('http://localhost:5001/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert('Upload successful: ' + result.message);
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.log("WHAT error: ", error)
      console.error('Error uploading the file', error);
      alert('Error uploading the file');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <input type="file" onChange={handleFileChange} accept="video/*" />
        <button onClick={handleUpload}>Upload Video</button>
      </header>
    </div>
  );
}

export default App;
