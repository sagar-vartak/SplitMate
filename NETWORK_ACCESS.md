# Accessing the App from Other Devices on Your Home Network

## Step 1: Update the Dev Server

The dev script has been updated to bind to all network interfaces (`0.0.0.0`), which allows access from other devices on your network.

## Step 2: Find Your Computer's Local IP Address

### On macOS:
1. Open **System Settings** → **Network**
2. Select your active network connection (Wi-Fi or Ethernet)
3. Your IP address will be displayed (e.g., `192.168.1.100`)

Or run this command in Terminal:
```bash
ipconfig getifaddr en0
```
(Replace `en0` with `en1` if you're on Ethernet, or check with `ifconfig`)

### On Windows:
1. Open **Command Prompt** or **PowerShell**
2. Run: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter

### On Linux:
```bash
hostname -I
```
or
```bash
ip addr show
```

## Step 3: Start the Development Server

Run the dev server as usual:
```bash
npm run dev
```

The server will start and show you the local URL (usually `http://localhost:3000`).

## Step 4: Access from Other Devices

On any device connected to the same Wi-Fi network:

1. Open a web browser
2. Navigate to: `http://YOUR_IP_ADDRESS:3000`
   - Replace `YOUR_IP_ADDRESS` with the IP you found in Step 2
   - Example: `http://192.168.1.100:3000`

## Troubleshooting

### Can't access from other devices?

1. **Check Firewall**: Make sure your Mac's firewall allows incoming connections on port 3000
   - System Settings → Network → Firewall → Options
   - Add Node.js or allow port 3000

2. **Verify Same Network**: Ensure all devices are on the same Wi-Fi network

3. **Check IP Address**: Your IP might change if you reconnect to Wi-Fi. Check it again if needed.

4. **Try Different Port**: If port 3000 is blocked, you can specify a different port:
   ```bash
   next dev -H 0.0.0.0 -p 3001
   ```

### Security Note

⚠️ **Important**: The `-H 0.0.0.0` flag makes your dev server accessible to anyone on your local network. This is fine for development on your home network, but:
- Don't use this on public Wi-Fi
- Only use it on trusted networks
- For production, use proper hosting with security measures

