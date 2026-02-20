const { createApp, ref, onMounted, onUnmounted, computed } = Vue;

const App = {
    setup() {
        const isTerminalMode = ref(false);
        const canvas = ref(null);
        const terminalText = ref('');
        const showCursor = ref(true);
        const mouseX = ref(0);
        const mouseY = ref(0);
        const isTransitioning = ref(false);
        const typingDone = ref(false);

        let animationId = null;
        let ctx = null;
        let time = 0;
        let cursorInterval = null;
        let wavePoints = [];

        const terminalContent = `
> daniel jeranko
> jerankda@pm.me
> github

─────────────────

> habits.
> festify.

[ space to return ]`;

        const terminalHTML = `
> daniel jeranko
> <a href="mailto:jerankda@pm.me" onclick="event.stopPropagation()">jerankda@pm.me</a>
> <a href="https://github.com/jerankda" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">github</a>

─────────────────

> <a href="https://habits.jerankda.dev" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">habits.</a>
> <a href="https://festify.jerankda.dev" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">festify.</a>

[ space to return ]`;

        const initCanvas = () => {
            const canvasEl = canvas.value;
            if (!canvasEl) return;

            ctx = canvasEl.getContext('2d');
            resizeCanvas();

            // Initialize wave points for the morphing wave field
            wavePoints = [];
            const spacing = 25;
            for (let x = 0; x < canvasEl.width + spacing; x += spacing) {
                for (let y = 0; y < canvasEl.height + spacing; y += spacing) {
                    wavePoints.push({
                        baseX: x,
                        baseY: y,
                        x: x,
                        y: y,
                        char: getRandomChar(),
                        phase: Math.random() * Math.PI * 2,
                        speed: 0.5 + Math.random() * 1.5
                    });
                }
            }
        };

        const getRandomChar = () => {
            const chars = '▓▒░█▄▀■□●○◆◇╳╱╲─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬▲▼◄►';
            return chars[Math.floor(Math.random() * chars.length)];
        };

        const resizeCanvas = () => {
            const canvasEl = canvas.value;
            if (!canvasEl) return;
            canvasEl.width = window.innerWidth;
            canvasEl.height = window.innerHeight;
        };

        // Simplex-like noise function
        const noise = (x, y, t) => {
            return Math.sin(x * 0.02 + t) * Math.cos(y * 0.02 + t * 0.7) * 
                   Math.sin((x + y) * 0.01 + t * 0.5) +
                   Math.sin(x * 0.05 - t * 1.3) * Math.cos(y * 0.03 + t);
        };

        const drawWaveField = () => {
            const canvasEl = canvas.value;
            if (!canvasEl || !ctx) return;

            // Clear with slight trail
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

            const centerX = canvasEl.width / 2;
            const centerY = canvasEl.height / 2;

            ctx.font = '14px JetBrains Mono';

            wavePoints.forEach(p => {
                // Complex wave distortion
                const distFromCenter = Math.sqrt(
                    Math.pow(p.baseX - centerX, 2) + 
                    Math.pow(p.baseY - centerY, 2)
                );
                
                const mouseDistX = mouseX.value - p.baseX;
                const mouseDistY = mouseY.value - p.baseY;
                const mouseDist = Math.sqrt(mouseDistX * mouseDistX + mouseDistY * mouseDistY);
                const mouseInfluence = Math.max(0, 1 - mouseDist / 250);

                // Ripple from center
                const ripple = Math.sin(distFromCenter * 0.02 - time * 2) * 20;
                
                // Noise displacement
                const n = noise(p.baseX, p.baseY, time * 0.5);
                
                // Mouse repulsion
                const repelX = mouseInfluence * mouseDistX * 0.3;
                const repelY = mouseInfluence * mouseDistY * 0.3;

                p.x = p.baseX + Math.cos(p.phase + time * p.speed) * (10 + ripple * 0.5) + n * 15 - repelX;
                p.y = p.baseY + Math.sin(p.phase + time * p.speed) * (10 + ripple * 0.5) + n * 15 - repelY;

                // Color based on position and time - white/grey palette
                const brightness = 0.3 + 
                    Math.sin(distFromCenter * 0.01 - time) * 0.2 +
                    mouseInfluence * 0.5 +
                    Math.abs(n) * 0.2;
                
                const grey = Math.floor(brightness * 255);
                ctx.fillStyle = `rgb(${grey}, ${grey}, ${grey})`;

                // Occasionally change character
                if (Math.random() > 0.995) {
                    p.char = getRandomChar();
                }

                ctx.fillText(p.char, p.x, p.y);
            });
        };

        const drawCenterShape = () => {
            if (!ctx) return;
            const canvasEl = canvas.value;

            ctx.font = '16px JetBrains Mono';
            ctx.textAlign = 'center';
            
            const pulse = 0.4 + Math.sin(time * 2) * 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.fillText('[ click ]', canvasEl.width / 2, canvasEl.height / 2);

            ctx.textAlign = 'left';
        };

        const drawScanlines = () => {
            const canvasEl = canvas.value;
            if (!ctx) return;

            // Subtle scanlines
            ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
            for (let y = 0; y < canvasEl.height; y += 3) {
                ctx.fillRect(0, y, canvasEl.width, 1);
            }

            // Occasional horizontal glitch line
            if (Math.random() > 0.98) {
                const y = Math.random() * canvasEl.height;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(0, y, canvasEl.width, 2);
            }
        };

        const animate = () => {
            if (isTerminalMode.value) return;

            time += 0.016;
            
            drawWaveField();
            drawCenterShape();
            drawScanlines();

            animationId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e) => {
            mouseX.value = e.clientX;
            mouseY.value = e.clientY;
        };

        const typeTerminal = async () => {
            terminalText.value = '';
            typingDone.value = false;
            for (let i = 0; i < terminalContent.length; i++) {
                terminalText.value += terminalContent[i];
                await new Promise(r => setTimeout(r, 25));
            }
            typingDone.value = true;
        };

        const toggleMode = async () => {
            if (isTransitioning.value) return;
            isTransitioning.value = true;

            if (!isTerminalMode.value) {
                cancelAnimationFrame(animationId);

                // Collapse animation - all points rush to center
                const canvasEl = canvas.value;
                const centerX = canvasEl.width / 2;
                const centerY = canvasEl.height / 2;

                for (let i = 0; i < 40; i++) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

                    ctx.font = '14px JetBrains Mono';
                    wavePoints.forEach(p => {
                        const dx = centerX - p.x;
                        const dy = centerY - p.y;
                        p.x += dx * 0.08;
                        p.y += dy * 0.08;

                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const brightness = Math.min(255, dist * 0.5);
                        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
                        ctx.fillText(p.char, p.x, p.y);
                    });

                    await new Promise(r => setTimeout(r, 16));
                }

                isTerminalMode.value = true;
                await typeTerminal();
            } else {
                isTerminalMode.value = false;
                terminalText.value = '';
                typingDone.value = false;
                initCanvas();
                animate();
            }

            isTransitioning.value = false;
        };

        const handleKeyDown = (e) => {
            if (e.code === 'Space' && isTerminalMode.value) {
                e.preventDefault();
                toggleMode();
            }
        };

        onMounted(() => {
            initCanvas();
            animate();

            window.addEventListener('resize', resizeCanvas);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('keydown', handleKeyDown);

            cursorInterval = setInterval(() => {
                showCursor.value = !showCursor.value;
            }, 530);
        });

        onUnmounted(() => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
            clearInterval(cursorInterval);
        });

        return {
            canvas,
            isTerminalMode,
            terminalText,
            terminalHTML,
            showCursor,
            typingDone,
            toggleMode
        };
    },
    template: `
        <div class="container" @click="toggleMode">
            <canvas ref="canvas" v-show="!isTerminalMode" class="ascii-canvas"></canvas>
            
            <transition name="terminal">
                <div v-if="isTerminalMode" class="terminal">
                    <pre class="terminal-content"><span v-if="typingDone" v-html="terminalHTML"></span><template v-else>{{ terminalText }}</template><span class="cursor" :class="{ visible: showCursor }">_</span></pre>
                </div>
            </transition>
        </div>
    `
};

const app = createApp(App);
app.mount('#app');

// Add styles dynamically
const style = document.createElement('style');
style.textContent = `
    .container {
        width: 100%;
        height: 100%;
        background: #000;
        cursor: pointer;
        overflow: hidden;
    }

    .ascii-canvas {
        display: block;
        width: 100%;
        height: 100%;
    }

    .terminal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
    }

    .terminal-content {
        font-family: 'JetBrains Mono', monospace;
        font-size: 18px;
        line-height: 1.8;
        color: #fff;
        margin: 0;
        white-space: pre;
        letter-spacing: 1px;
    }

    .cursor {
        opacity: 0;
        color: #fff;
    }

    .cursor.visible {
        opacity: 1;
    }

    .terminal-enter-active {
        animation: fadeIn 0.5s ease-out;
    }

    .terminal-leave-active {
        animation: fadeOut 0.3s ease-in;
    }

    @keyframes fadeIn {
        0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
        }
        100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
    }

    @keyframes fadeOut {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.05);
        }
    }

    .terminal-content a {
        color: #fff;
        text-decoration: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: border-color 0.2s;
    }

    .terminal-content a:hover {
        border-bottom-color: #fff;
    }

    @media (max-width: 768px) {
        .terminal-content {
            font-size: 14px;
        }
    }
`;
document.head.appendChild(style);
