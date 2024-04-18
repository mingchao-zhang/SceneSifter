import React, { useState, useRef } from "react";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [videoData, setVideoData] = useState([]);
  const videoRefs = useRef(new Map());
  const [keywords, setKeywords] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    } else {
      setSelectedFile(null);
      setFileName("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("video", selectedFile);

    // setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5001/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert("Upload successful: " + result.message);
      } else {
        alert("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading the file", error);
      alert("Error uploading the file");
    }
    // setIsLoading(false);
  };

  const handleKeywordsChange = (event) => {
    setKeywords(event.target.value);
  };

  const handleQuery = async () => {
    setIsLoading(true);
    setVideoData([]);
    try {
      const response = await fetch("http://localhost:5001/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keywords: keywords }),
      });
      if (response.ok) {
        const data = await response.json();
        setVideoData(data.videos);
        console.log("Query succeeded!");
      }
    } catch (error) {
      console.error("Error during query", error);
      alert("Error during query");
    }
    setIsLoading(false);
  };

  const seekTo = (videoName, startTime) => {
    const video = videoRefs.current.get(videoName);
    if (video) {
      video.currentTime = startTime;
    }
  };

  const clearSearch = () => {
    setKeywords("");
  };

  const handleKeyDown = (event) => {
    // Check if the Enter key was pressed
    if (event.key === "Enter") {
      handleQuery();
    }
  };

  return (
    <div className="App">
      {/* loading overlay; displayed while waiting for responses */}
      {isLoading && (
        <div className="loading-overlay show">
          <div className="spinner"></div>
        </div>
      )}

      <header className="header-background">
        <div className="header-icon"></div>
        <h1 className="app-title">SceneSifter</h1>
        <div></div>
      </header>

      <input type="file" onChange={handleFileChange} accept="video/*" />
      <button onClick={handleUpload}>Upload Video</button>
      {fileName && <p>Selected file: {fileName}</p>}

      <div className="search-box">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            value={keywords}
            onChange={handleKeywordsChange}
            placeholder="Enter keywords..."
            onKeyDown={handleKeyDown}
          />
          {keywords && (
            <span className="clear-icon" onClick={clearSearch}>
              ✖️
            </span>
          )}
        </div>
        <button onClick={handleQuery}>Search</button>
      </div>

      <div className="video-listing">
        {videoData.map((video, index) => (
          <div key={index} className="video-item">
            <div className="video-title">{video.videoName}</div>
            <video
              ref={(el) => videoRefs.current.set(video.videoName, el)}
              controls
            >
              <source src={video.videoPath} type="video/mp4" />
              This video is not supported by the current browser.
            </video>
            {/* Display start times that are relevant to the search word */}
            <ul>
              {video.startTimes.map((startTime, idx) => (
                <li key={idx}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      seekTo(video.videoName, startTime);
                    }}
                  >
                    {startTime}s - {video.descriptions[idx]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
