import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState(''); // store the selected file name
  const [keywords, setKeywords] = useState('');
  const [videoUrl, setVideoUrl] = useState(''); // store the video URL
  const [timestamps, setTimestamps] = useState([]); // timestamps of the video
  const [texts, setTexts] = useState([]); // corresponding texts of timestamps
  const videoRef = useRef(null); // reference to the video player

  const handleKeywordsChange = (event) => {
    setKeywords(event.target.value);
  };

  const handleQuery = async () => {
    try {
      const response = await fetch('http://localhost:5001/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: keywords }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data.videoPath)
        setVideoUrl(data.videoPath); // Set video URL from the response
        setTimestamps(data.timestamps); // Set timestamps from the response
        setTexts(data.texts); // Set texts from the response
      } else {
        alert('Query failed');
      }
    } catch (error) {
      console.error('Error during query', error);
      alert('Error during query');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    } else {
      setSelectedFile(null);
      setFileName('');
    }
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
      console.error('Error uploading the file', error);
      alert('Error uploading the file');
    }
  };

  const seekTo = (timeString) => {
    const parts = timeString.split(':');
    // parts = [h, m, s]
    const totalTimeInSeconds = (+parts[0] * 3600) + (+parts[1] * 60) + (+parts[2]);
    videoRef.current.currentTime = totalTimeInSeconds;
  };

  return (
    <div className="App">
      <header className="App-header">
        <input type="file" onChange={handleFileChange} accept="video/*" />
        <button onClick={handleUpload}>Upload Video</button>
        {fileName && <p>Selected file: {fileName}</p>}
        {videoUrl && (
          <div>
            <video ref={videoRef} width="640" controls>
              <source src={videoUrl} type="video/mp4" />
              The video element is not supported in this browser.
            </video>
            <ul>
              {timestamps.map((timestamp, index) => (
                <li key={index}>
                  <a href="#" onClick={(e) => { 
                    e.preventDefault(); 
                    seekTo(timestamp);
                    console.log(timestamp, videoUrl)
                    }}>
                    {timestamp} - {texts[index]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>
      <input
          type="text"
          placeholder="Enter keywords..."
          value={keywords}
          onChange={handleKeywordsChange}
        />
        <button onClick={handleQuery}>Search Videos</button>
    </div>
  );
}

export default App;
