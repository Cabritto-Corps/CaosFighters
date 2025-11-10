const { spawn, exec } = require('child_process')
const path = require('path')

const isWindows = process.platform === 'win32'

console.log('🚀 Iniciando todos os serviços...\n')

// Função para matar processos ao sair
const processes = []
process.on('SIGINT', () => {
    console.log('\n\n🛑 Parando todos os serviços...')
    processes.forEach((p) => {
        try {
            if (isWindows) {
                spawn('taskkill', ['/pid', p.pid, '/f', '/t'], { shell: true })
            } else {
                p.kill('SIGTERM')
            }
        } catch (e) {
            // Ignore
        }
    })
    process.exit(0)
})

// Função para matar processos ngrok existentes
const killExistingNgrok = () => {
    return new Promise((resolve) => {
        console.log('🔄 Encerrando processos ngrok existentes...')
        if (isWindows) {
            exec('taskkill /F /IM ngrok.exe 2>nul', () => {
                setTimeout(resolve, 1000)
            })
        } else {
            exec('pkill -9 -f ngrok 2>/dev/null', () => {
                setTimeout(resolve, 1000)
            })
        }
    })
}

// Matar processos ngrok existentes antes de iniciar
killExistingNgrok().then(() => {
    console.log('✅ Processos ngrok encerrados. Iniciando novo túnel...\n')

    // 1. Ngrok para Backend Laravel (porta 8000)
    console.log('🌐 Iniciando Ngrok para Backend Laravel (porta 8000)...')
    const ngrokBackend = spawn('ngrok.exe', ['http', '8000'], {
        shell: isWindows,
        stdio: 'inherit',
    })
    processes.push(ngrokBackend)

    console.log('✅ Ngrok iniciado! Aguarde a URL do túnel aparecer acima.\n')
    // Aguardar ngrok iniciar antes de iniciar Laravel
    setTimeout(() => {
        // 2. Backend Laravel
        console.log('📦 Iniciando Backend Laravel na porta 8000...')
        const laravel = spawn('php', ['artisan', 'serve'], {
            cwd: path.join(process.cwd(), 'backend'),
            shell: isWindows,
            stdio: 'inherit',
        })
        processes.push(laravel)

        // Aguardar um pouco para Laravel iniciar
        setTimeout(() => {
            // 3. Laravel Reverb WebSocket
            console.log('\n🔌 Iniciando Laravel Reverb WebSocket na porta 8080...')
            const reverb = spawn('php', ['artisan', 'reverb:start'], {
                cwd: path.join(process.cwd(), 'backend'),
                shell: isWindows,
                stdio: 'inherit',
            })
            processes.push(reverb)

            setTimeout(() => {
                // 4. Frontend Expo
                console.log('📱 Iniciando Frontend Expo...\n')
                const expo = spawn('pnpm', ['start'], {
                    shell: isWindows,
                    stdio: 'inherit',
                })
                processes.push(expo)

                console.log('\n✅ Todos os serviços iniciados!')
                console.log('📝 URLs:')
                console.log('   - Backend Laravel: http://localhost:8000')
                console.log('   - WebSocket Reverb: ws://localhost:8080')
                console.log('   - Ngrok: Verifique a URL acima (porta 8000)')
                console.log('\n💡 Copie a URL do ngrok e atualize:')
                console.log('   - EXPO_PUBLIC_API_URL no src/.env')
                console.log('   - REVERB_HOST no backend/.env (mesma URL do ngrok)')
                console.log('\n💡 Pressione Ctrl+C para parar todos os serviços\n')
            }, 2000)
        }, 3000)
    }, 3000)
})
