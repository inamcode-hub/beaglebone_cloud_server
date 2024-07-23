const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');

// Local and remote paths
const localPath = path.resolve(__dirname, '..');
const remotePath = '/home/ubuntu/beaglebone_cloud_server'; // Update with your remote path

// Check if running in Windows or Unix-like environment
const isWindows = process.platform === 'win32';
const privateKeyPath = isWindows
  ? 'C:\\Users\\inamd\\OneDrive\\Desktop\\my work\\aws\\AWS EC2\\webserver.pem'
  : '/mnt/c/Users/inamd/OneDrive/Desktop/my work/aws/AWS EC2/webserver.pem';

// Function to get list of changed files using Git
function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD').toString().trim();
    return output ? output.split('\n') : [];
  } catch (err) {
    console.error('Error getting changed files:', err);
    return [];
  }
}

// Helper function to format paths correctly for SCP
function formatPath(p) {
  return p.replace(/\\/g, '/');
}

function transferFiles() {
  try {
    // Get list of changed files
    const changedFiles = getChangedFiles();

    if (changedFiles.length === 0) {
      console.log('No files changed. Nothing to transfer.');
      return;
    }

    console.log(`Transferring ${changedFiles.length} changed files...`);

    // Upload changed files
    changedFiles.forEach((file) => {
      const localFile = formatPath(path.join(localPath, file));
      if (fs.existsSync(localFile)) {
        const remoteFile = formatPath(path.join(remotePath, file));
        console.log(`Preparing to transfer ${localFile} to ${remoteFile}`);

        const scpCommand = `scp -i "${privateKeyPath}" "${localFile}" ubuntu@3.96.121.119:"${remoteFile}"`;
        exec(scpCommand, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error transferring ${localFile}: ${stderr}`);
          } else {
            console.log(
              `Successfully transferred ${localFile} to ${remoteFile}`
            );
          }
        });
      } else {
        console.warn(`File does not exist: ${localFile}`);
      }
    });

    console.log('File transfer process completed.');
  } catch (err) {
    console.error('Error during file transfer:', err);
  }
}

function startWatcher() {
  console.log(`Starting file watcher on ${localPath}`);

  const watcher = chokidar.watch(localPath, {
    ignored: /node_modules|\.git/,
    persistent: true,
  });

  watcher.on('change', (filePath) => {
    console.log(`File changed: ${formatPath(filePath)}`);
    transferFiles();
  });

  watcher.on('error', (error) => {
    console.error('Watcher error:', error);
  });

  console.log('Watching for file changes...');
}

startWatcher();
