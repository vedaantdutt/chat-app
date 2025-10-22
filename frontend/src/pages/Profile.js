import React, { useState, useEffect, useRef } from "react";

export default function Profile({ user }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [profilePic, setProfilePic] = useState(null);

  const fileInputRef = useRef(null);


  useEffect(() => {
    if (!user?.userId) return;
    (async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/auth/user/${user.userId}`);
        if (!res.ok) {
          const txt = await res.text();
          console.error("Profile fetch failed:", res.status, txt.slice(0, 200));
          return;
        }
        const data = await res.json();
        let pic = data.profilePic || null;
        console.log("Fetched profile data:", data);
        if (pic) {
          // make absolute URL if backend returned a relative path like "uploads/xxx.jpg"
          if (!/^https?:\/\//i.test(pic)) {
            const origin = window.location.origin; // e.g. http://localhost:3000
            pic = `${origin}/${String(pic).replace(/^\/+/, "")}`;
          }
        }
        setProfilePic(pic);
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    })();
  }, [user?.userId]);


  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const uploadPhoto = async () => {
    if (!file || !user?.userId) return;
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/user/${user.userId}/photo`, {
        method: "POST",
        body: formData,
      });
    const data = await res.json();
      setProfilePic(data.profilePic || null);
    setFile(null);
    setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const removePhoto = async () => {
    if (!user?.userId) {
      setProfilePic(null);
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
    if (profilePic) {
      await fetch(`http://localhost:5000/api/auth/user/${user.userId}/photo`, {
        method: "DELETE",
      });
    }
    setProfilePic(null);
    setFile(null);
    setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Remove photo failed:", err);
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Profile Settings</h2>

      {/* Show either existing profilePic or preview */}
      {profilePic 
      && !preview 
      && <img src={profilePic} alt="Profile" width={100} />}
     
      {preview && <img src={preview} alt="Preview" width={100} />}

      <div style={{ marginTop: "10px" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={!!profilePic||!!preview} // disable if there's already a profilePic or preview
          
        />
        <button onClick={uploadPhoto} disabled={!file}>
          Upload
        </button>
        {(profilePic || preview) && <button onClick={removePhoto}>Remove Photo</button>}
      </div>
    </div>
  );
}
