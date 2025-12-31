import './style.css'

// ============================================
// Polar Coordinate Utilities
// ============================================

/**
 * Converts polar coordinates (angle in radians, radius) to cartesian coordinates
 * @param {number} angle - Angle in radians
 * @param {number} radius - Radius
 * @returns {{x: number, y: number}} Cartesian coordinates
 */
function polarToCartesian(angle, radius) {
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle)
  }
}

/**
 * Generates SVG path data for a sector (pie slice)
 * @param {number} centerX - X coordinate of circle center
 * @param {number} centerY - Y coordinate of circle center
 * @param {number} radius - Radius of the circle
 * @param {number} startAngle - Start angle in radians
 * @param {number} endAngle - End angle in radians
 * @returns {string} SVG path data string
 */
function createSectorPath(centerX, centerY, radius, startAngle, endAngle) {
  const start = polarToCartesian(startAngle, radius)
  const end = polarToCartesian(endAngle, radius)
  
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0
  
  return [
    `M ${centerX} ${centerY}`,           // Move to center
    `L ${centerX + start.x} ${centerY + start.y}`, // Line to start of arc
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${centerX + end.x} ${centerY + end.y}`, // Arc
    `Z`                                   // Close path (back to center)
  ].join(' ')
}

// ============================================
// Render Function
// ============================================

/**
 * Renders a circle partitioned into N equal slices
 * @param {SVGElement} svgEl - SVG element to render into
 * @param {number} N - Number of slices (1-24)
 */
function renderCirclePartition(svgEl, N) {
  // Clear existing content
  svgEl.innerHTML = ''
  
  // Circle dimensions
  const viewBoxSize = 400
  const centerX = viewBoxSize / 2
  const centerY = viewBoxSize / 2
  const radius = 150
  
  // Set viewBox for scalable SVG
  svgEl.setAttribute('viewBox', `0 0 ${viewBoxSize} ${viewBoxSize}`)
  
  // Create a group element for event delegation
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  group.setAttribute('id', 'slices-group')
  group.setAttribute('class', 'slices-group')
  
  // Calculate angle per slice
  const anglePerSlice = (2 * Math.PI) / N
  
  // Create slices
  for (let i = 0; i < N; i++) {
    const startAngle = i * anglePerSlice - Math.PI / 2 // Start at top (-90 degrees)
    const endAngle = (i + 1) * anglePerSlice - Math.PI / 2
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', createSectorPath(centerX, centerY, radius, startAngle, endAngle))
    path.setAttribute('class', 'slice')
    path.setAttribute('data-index', i)
    
    group.appendChild(path)
  }
  
  svgEl.appendChild(group)
}

// ============================================
// App State and Mounting
// ============================================

let state = {
  N: 6, // Default value, range [1, 24]
  mode: 'cut', // 'cut', 'merge', or 'tap', default 'cut'
  tapCount: 0 // Total tap count for Tap Mode
}

// Audio context for tap sounds (created on first use)
let audioContext = null

/**
 * Updates the N value and re-renders
 */
function updateN(newN) {
  // Clamp N to valid range
  newN = Math.max(1, Math.min(24, Math.floor(newN)))
  
  if (state.N !== newN) {
    state.N = newN
    const svgEl = document.querySelector('#circle-svg')
    const labelEl = document.querySelector('#n-label')
    
    if (svgEl) {
      renderCirclePartition(svgEl, state.N)
      // Re-attach click handler after re-render
      attachCircleClickHandler(svgEl)
    }
    
    if (labelEl) {
      labelEl.textContent = `N = ${state.N}`
    }
    
    // Update input value if it exists
    const inputEl = document.querySelector('#n-input')
    if (inputEl) {
      inputEl.value = state.N
    }
  }
}

/**
 * Updates the tool mode and UI
 */
function updateMode(newMode) {
  if (state.mode !== newMode && (newMode === 'cut' || newMode === 'merge' || newMode === 'tap')) {
    state.mode = newMode
    updateModeButtons()
    updateCursor()
    updateTapPadVisibility()
  }
}

/**
 * Updates the active state of mode buttons
 */
function updateModeButtons() {
  const cutBtn = document.querySelector('#cut-btn')
  const mergeBtn = document.querySelector('#merge-btn')
  const tapBtn = document.querySelector('#tap-btn')
  
  if (cutBtn) {
    if (state.mode === 'cut') {
      cutBtn.classList.add('active')
    } else {
      cutBtn.classList.remove('active')
    }
  }
  
  if (mergeBtn) {
    if (state.mode === 'merge') {
      mergeBtn.classList.add('active')
    } else {
      mergeBtn.classList.remove('active')
    }
  }
  
  if (tapBtn) {
    if (state.mode === 'tap') {
      tapBtn.classList.add('active')
    } else {
      tapBtn.classList.remove('active')
    }
  }
}

/**
 * Updates cursor style on SVG based on current mode
 */
function updateCursor() {
  const svgEl = document.querySelector('#circle-svg')
  if (svgEl) {
    if (state.mode === 'cut') {
      svgEl.classList.remove('merge-mode', 'tap-mode')
      svgEl.classList.add('cut-mode')
    } else if (state.mode === 'merge') {
      svgEl.classList.remove('cut-mode', 'tap-mode')
      svgEl.classList.add('merge-mode')
    } else {
      svgEl.classList.remove('cut-mode', 'merge-mode')
      svgEl.classList.add('tap-mode')
    }
  }
}

/**
 * Updates tap pad visibility based on current mode
 */
function updateTapPadVisibility() {
  const tapPad = document.querySelector('#tap-pad-container')
  if (tapPad) {
    if (state.mode === 'tap') {
      tapPad.style.display = 'block'
      // Update tap count display when entering tap mode
      updateTapCountDisplay()
    } else {
      tapPad.style.display = 'none'
    }
  }
}

/**
 * Animates the circle group with a pulse effect
 */
function animateCircleClick() {
  const group = document.querySelector('#slices-group')
  if (group) {
    group.classList.add('click-pulse')
    setTimeout(() => {
      group.classList.remove('click-pulse')
    }, 300)
  }
}

/**
 * Attaches click handler to SVG group for event delegation
 */
function attachCircleClickHandler(svgEl) {
  const group = svgEl.querySelector('#slices-group')
  if (group) {
    // Remove existing listener if any
    group.removeEventListener('click', handleCircleClick)
    group.addEventListener('click', handleCircleClick)
  }
}

/**
 * Handles clicks on the circle visualization
 */
function handleCircleClick(e) {
  // Only process if clicking on a slice (not empty space) and not in tap mode
  if (e.target.classList.contains('slice') && state.mode !== 'tap') {
    if (state.mode === 'cut') {
      updateN(Math.min(24, state.N + 1))
    } else if (state.mode === 'merge') {
      updateN(Math.max(1, state.N - 1))
    }
    animateCircleClick()
  }
}

// ============================================
// Tap Mode Functions
// ============================================

/**
 * Creates a subtle click sound using Web Audio API
 */
function playTapSound() {
  try {
    // Create audio context on first use (requires user interaction)
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    
    // Resume context if it's suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
    
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Generate a subtle click sound (short, low frequency tone)
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.05)
  } catch (error) {
    // Silently fail if Web Audio API is not available
    console.debug('Web Audio API not available:', error)
  }
}

/**
 * Records a tap and updates N based on total tap count
 */
function recordTap() {
  if (state.mode === 'tap') {
    // Increment tap count
    state.tapCount++
    
    // Play sound feedback
    playTapSound()
    
    // Update N based on tap count (clamped to 1-24)
    const newN = Math.max(1, Math.min(24, state.tapCount))
    updateN(newN)
    
    // Update tap count display
    updateTapCountDisplay()
  }
}

/**
 * Updates the tap count display
 */
function updateTapCountDisplay() {
  const tapCountEl = document.querySelector('#tap-count')
  if (tapCountEl) {
    tapCountEl.textContent = `Total taps: ${state.tapCount}`
  }
}

/**
 * Resets tap count and optionally resets N to default
 */
function resetTaps() {
  state.tapCount = 0
  updateTapCountDisplay()
  // Optionally reset N to 1, or keep current N - keeping current N for better UX
  // updateN(1)
}

/**
 * Mounts the app
 */
function mountApp() {
  const app = document.querySelector('#app')
  
  app.innerHTML = `
    <div class="container">
      <div class="controls">
        <label for="n-input">Number of slices (1-24):</label>
        <input 
          type="range" 
          id="n-input" 
          min="1" 
          max="24" 
          value="${state.N}"
        />
      </div>
      <div class="tool-mode-controls">
        <button id="cut-btn" class="tool-btn active" aria-label="Cut mode - click to add slices">✂ Cut</button>
        <button id="merge-btn" class="tool-btn" aria-label="Merge mode - click to remove slices">🪢 Merge</button>
        <button id="tap-btn" class="tool-btn" aria-label="Tap mode - tap to set number of slices">🎵 Tap</button>
      </div>
      <div id="tap-pad-container" class="tap-pad-container" style="display: none;">
        <div id="tap-pad" class="tap-pad" aria-label="Tap pad - click or tap to record rhythm">
          <div class="tap-pad-label">Tap Here</div>
        </div>
        <div class="tap-info">
          <div id="tap-count" class="tap-count">Total taps: 0</div>
          <button id="reset-taps-btn" class="reset-taps-btn" aria-label="Reset taps">Reset taps</button>
        </div>
      </div>
      <div class="visualization-wrapper">
        <button id="decrease-btn" class="step-btn" aria-label="Decrease number of slices">−</button>
        <svg id="circle-svg" class="circle-svg cut-mode"></svg>
        <button id="increase-btn" class="step-btn" aria-label="Increase number of slices">+</button>
      </div>
      <div id="n-label" class="label">N = ${state.N}</div>
    </div>
  `
  
  // Get references
  const svgEl = document.querySelector('#circle-svg')
  const inputEl = document.querySelector('#n-input')
  const decreaseBtn = document.querySelector('#decrease-btn')
  const increaseBtn = document.querySelector('#increase-btn')
  const cutBtn = document.querySelector('#cut-btn')
  const mergeBtn = document.querySelector('#merge-btn')
  const tapBtn = document.querySelector('#tap-btn')
  const tapPad = document.querySelector('#tap-pad')
  const resetTapsBtn = document.querySelector('#reset-taps-btn')
  
  // Initial render
  renderCirclePartition(svgEl, state.N)
  attachCircleClickHandler(svgEl)
  updateModeButtons()
  updateCursor()
  updateTapPadVisibility()
  
  // Wire up controls
  inputEl.addEventListener('input', (e) => {
    updateN(Number(e.target.value))
  })
  
  decreaseBtn.addEventListener('click', () => {
    updateN(state.N - 1)
  })
  
  increaseBtn.addEventListener('click', () => {
    updateN(state.N + 1)
  })
  
  // Wire up tool mode buttons
  cutBtn.addEventListener('click', () => {
    updateMode('cut')
  })
  
  mergeBtn.addEventListener('click', () => {
    updateMode('merge')
  })
  
  tapBtn.addEventListener('click', () => {
    updateMode('tap')
  })
  
  // Wire up tap pad
  if (tapPad) {
    tapPad.addEventListener('click', recordTap)
    // Also support touch events for mobile
    tapPad.addEventListener('touchend', (e) => {
      e.preventDefault()
      recordTap()
    })
  }
  
  // Wire up reset taps button
  if (resetTapsBtn) {
    resetTapsBtn.addEventListener('click', resetTaps)
  }
  
  // Keyboard support: ArrowUp/ArrowRight => +1, ArrowDown/ArrowLeft => -1
  document.addEventListener('keydown', (e) => {
    // Only handle if not typing in an input field
    if (e.target.tagName === 'INPUT') {
      return
    }
    
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault()
      updateN(state.N + 1)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault()
      updateN(state.N - 1)
    }
  })
}

// Mount when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp)
} else {
  mountApp()
}
