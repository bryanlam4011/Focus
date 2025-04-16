import AgoraRTC from "agora-rtc-sdk-ng";
//run npm install agora-rtc-sdk-ng
// RTC client instance
let client = null;
// Local audio track
let localAudioTrack = null;

// Connection parameters
let appId = "adb001d4affe4c3288e284889716247f";
let channel = "test";
let token = "007eJxTYHDp4a6oi5NdvczF5LQGy5znUyQ/xUftndjqeMsueY920V8FhsSUJAMDwxSTxLS0VJNkYyMLi1QjCxMLC0tzQzMjE/M0lcjv6Q2BjAyTE9hZGRkgEMRnYShJLS5hYAAA6YYd7g==";
let uid = 0; // User ID

// Initialize the AgoraRTC client
function initializeClient() {
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    setupEventListeners();
}

// Handle client events
function setupEventListeners() {
    // Set up event listeners for remote tracks
    client.on("user-published", async (user, mediaType) => {
        // Subscribe to the remote user when the SDK triggers the "user-published" event
        await client.subscribe(user, mediaType);
        console.log("subscribe success");
        // If the remote user publishes an audio track.
        if (mediaType === "audio") {
            // Get the RemoteAudioTrack object in the AgoraRTCRemoteUser object.
            const remoteAudioTrack = user.audioTrack;
            // Play the remote audio track.
            remoteAudioTrack.play();
        }
    });

    // Listen for the "user-unpublished" event
    client.on("user-unpublished", async (user) => {
        // Remote user unpublished
    });
}

// Create a local audio track
async function createLocalAudioTrack() {
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
}


// Publish local audio track
async function publishLocalAudio() {
    await client.publish([localAudioTrack]);
}

// Join the channel and publish local audio
async function joinChannel() {
    await client.join(appId, channel, token, uid);
    await createLocalAudioTrack();
    await publishLocalAudio();
    console.log("Publish success!");
}

// Leave the channel and clean up
async function leaveChannel() {
    localAudioTrack.close(); // Stop local audio
    await client.leave();    // Leave the channel
    console.log("Left the channel.");
}

// Set up button click handlers
function setupButtonHandlers() {
    document.getElementById("join").onclick = joinChannel;
    document.getElementById("leave").onclick = leaveChannel;
}

// Start the basic call process
function startBasicCall() {
    initializeClient();
    //window.onload = setupButtonHandlers;
}

startBasicCall();