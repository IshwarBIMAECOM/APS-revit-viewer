const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const http = require('http')

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST'){
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try{
                const { urn, modelId, clientId, clientSecret } = JSON.parse(body)
                console.log(`🔄 SVF→glTF conversion for ${modelId}`)

                process.env.APS_CLIENT_ID = clientId
                process.env.APS_CLIENT_SECRET = clientSecret

                const outputDir = `/app/output/${modelId}`
                if (!fs.existsSync(outputDir)){
                    fs.mkdirSync(outputDir, { recursive: true })
                }

                const cmd  = `svf-to-gltf "${urn}" --output-folder "${outputDir}" --deduplicate --skip-unused-uvs --ignore-lines --ignore-points`

                exec(cmd, {cwd: outputDir}, (error, stdout, stderr)=>{
                    if (error){
                        console.error(`SVF→glTF conversion failed: ${error}`)
                        res.writeHead(500)
                        res.end(JSON.stringify({ success: false, error: error.message, stderr: stderr }))
                        return
                    }
                    
                })
            }
        })
    }
})