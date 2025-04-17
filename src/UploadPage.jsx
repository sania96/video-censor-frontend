// frontend/src/UploadPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './UploadPage.module.css'; // Import the CSS module

function UploadPage() {
  const [videoFile, setVideoFile] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [processedS3Key, setProcessedS3Key] = useState('');

  const API_BASE_URL = `http://${process.env.REACT_APP_EC2_PUBLIC_IP}:8000`;

  useEffect(() => {
    console.log("REACT_APP_EC2_PUBLIC_IP from env:", process.env.REACT_APP_EC2_PUBLIC_IP);
    console.log("API Base URL:", API_BASE_URL);
    console.log("AWS Bucket Name from env:", process.env.AWS_BUCKET_NAME);
  }, []);

  const handleFileChange = (e) => {
    setVideoFile(e.target.files[0]);
    setUploadError('');
    setDownloadUrl('');
    setProcessedS3Key('');
  };

  const handleUpload = async () => {
    if (!videoFile) {
      setUploadError("Please select a video!");
      return;
    }

    setIsProcessing(true);
    setUploadError('');
    setDownloadUrl('');
    setProcessedS3Key('');

    console.log("Initiating upload and process...");
    console.log("API Endpoint for pre-signed URL:", `${API_BASE_URL}/generate-presigned-upload-url?filename=${videoFile.name}`);

    try {
      // Step 1: Get pre-signed URL for upload
      const { data: presignedData } = await axios.get(`${API_BASE_URL}/generate-presigned-upload-url?filename=${videoFile.name}`);
      const presignedUrl = presignedData.url;
      console.log("Pre-signed upload URL received:", presignedUrl);

      // Step 2: Upload directly to S3
      console.log("Uploading to S3 with URL:", presignedUrl);
      await axios.put(presignedUrl, videoFile, {
        headers: {
          'Content-Type': videoFile.type
        }
      });
      console.log("Video uploaded to S3 successfully.");

      // Step 3: Tell backend to process and get the S3 key
      console.log("Sending request to process video:", `${API_BASE_URL}/upload`);
      const { data: processResponse } = await axios.post(`${API_BASE_URL}/upload`, {
        file_name: videoFile.name,
      });
      console.log("Processing request successful. Response:", processResponse);

      setProcessedS3Key(processResponse.output_video_s3_key);
      alert("Video processed successfully! A download link will appear below.");
      // Immediately fetch the download URL after successful processing
      const { data: downloadData } = await axios.get(`${API_BASE_URL}/download-s3-url?s3_key=${processResponse.output_video_s3_key}`);
      setDownloadUrl(downloadData.url);
      console.log("Download URL received:", downloadData.url);

    } catch (error) {
      console.error('Upload failed:', error);
      if (error.response) {
        setUploadError(`Error processing video: ${error.response.data?.message || error.response.statusText}`);
        console.error('Server response:', error.response.data);
      } else if (error.request) {
        setUploadError('Error connecting to the server.');
      } else {
        setUploadError('An unexpected error occurred.');
      }
    } finally {
      setIsProcessing(false);
      console.log("Upload and process finished.");
    }
  };

  return (
    <div className={styles.pageContainer}>
      <h2 className={styles.title}>Censor Your Video</h2>
      <div className={styles.uploadContainer}>
        <input type="file" accept="video/mp4" onChange={handleFileChange} className={styles.fileInput} />
        <button onClick={handleUpload} disabled={isProcessing || !videoFile} className={styles.uploadButton}>
          {isProcessing ? "Upload & Process" : "Upload & Process"}
        </button>
        {isProcessing && <div className={styles.processingMessage}>Processing your video, please wait...</div>}
        {uploadError && <div className={styles.errorMessage}>{uploadError}</div>}
      </div>

      {processedS3Key && (
        <div className={styles.downloadContainer}>
          <h3 className={styles.downloadTitle}>Download Censored Video</h3>
          {downloadUrl ? (
            <div className={styles.downloadLink}>
              <a href={downloadUrl} download="processed_video.mp4" className={styles.styledLink}>
                Download Here
              </a>
            </div>
          ) : (
            <p>Fetching download link...</p>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadPage;