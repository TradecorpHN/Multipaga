// gradient.glsl
// Shader de gradientes dinámicos para elementos UI y 3D
// Soporta múltiples tipos de gradientes con animaciones

// ============================================================================
// VERTEX SHADER
// ============================================================================

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform float uTime;

void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;
    
    // Calcular posición mundial
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// ============================================================================
// FRAGMENT SHADER
// ============================================================================

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform float uTime;
uniform int uGradientType; // 0: linear, 1: radial, 2: angular, 3: noise, 4: wave
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform vec2 uDirection; // Para gradientes lineales
uniform vec2 uCenter; // Para gradientes radiales
uniform float uRadius; // Para gradientes radiales
uniform float uAngle; // Para gradientes angulares
uniform float uNoiseScale;
uniform float uWaveFrequency;
uniform float uWaveAmplitude;
uniform float uAnimationSpeed;
uniform float uOpacity;
uniform bool uReverse;

// Función de ruido para efectos orgánicos
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// FBM (Fractional Brownian Motion) para ruido más complejo
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;
    
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Función para interpolar entre múltiples colores
vec3 multiColorLerp(float t, vec3 color1, vec3 color2, vec3 color3, vec3 color4) {
    if (t < 0.33) {
        return mix(color1, color2, t * 3.0);
    } else if (t < 0.66) {
        return mix(color2, color3, (t - 0.33) * 3.0);
    } else {
        return mix(color3, color4, (t - 0.66) * 3.0);
    }
}

// Función para aplicar animación temporal
float applyTimeAnimation(float t) {
    float animatedTime = uTime * uAnimationSpeed;
    return fract(t + animatedTime);
}

void main() {
    vec2 uv = vUv;
    float gradientFactor = 0.0;
    
    // Aplicar animación temporal a las UVs
    vec2 animatedUv = uv + vec2(sin(uTime * uAnimationSpeed), cos(uTime * uAnimationSpeed * 0.7)) * 0.1;
    
    // Calcular factor de gradiente según el tipo
    if (uGradientType == 0) {
        // Gradiente lineal
        vec2 normalizedDirection = normalize(uDirection);
        gradientFactor = dot(uv - vec2(0.5), normalizedDirection) + 0.5;
        
    } else if (uGradientType == 1) {
        // Gradiente radial
        float distance = length(uv - uCenter);
        gradientFactor = distance / uRadius;
        
    } else if (uGradientType == 2) {
        // Gradiente angular
        vec2 centered = uv - vec2(0.5);
        float angle = atan(centered.y, centered.x) + 3.14159;
        gradientFactor = mod(angle + uAngle, 6.28318) / 6.28318;
        
    } else if (uGradientType == 3) {
        // Gradiente de ruido
        gradientFactor = fbm(animatedUv * uNoiseScale);
        
    } else if (uGradientType == 4) {
        // Gradiente de ondas
        float wave1 = sin(uv.x * uWaveFrequency + uTime * uAnimationSpeed) * uWaveAmplitude;
        float wave2 = cos(uv.y * uWaveFrequency * 0.7 + uTime * uAnimationSpeed * 0.8) * uWaveAmplitude;
        gradientFactor = (wave1 + wave2 + 2.0) * 0.25;
    }
    
    // Aplicar inversión si está habilitada
    if (uReverse) {
        gradientFactor = 1.0 - gradientFactor;
    }
    
    // Aplicar animación temporal
    gradientFactor = applyTimeAnimation(gradientFactor);
    
    // Clamp del factor
    gradientFactor = clamp(gradientFactor, 0.0, 1.0);
    
    // Interpolar colores
    vec3 finalColor = multiColorLerp(gradientFactor, uColor1, uColor2, uColor3, uColor4);
    
    // Efecto de brillo adicional basado en el gradiente
    float brightness = 1.0 + sin(gradientFactor * 6.28318 + uTime * uAnimationSpeed * 2.0) * 0.1;
    finalColor *= brightness;
    
    gl_FragColor = vec4(finalColor, uOpacity);
}

// ============================================================================
// TIPOS DE GRADIENTE PREDEFINIDOS
// ============================================================================

// Configuraciones recomendadas para diferentes efectos:

// Gradiente Hero (lineal animado):
// uGradientType: 0
// uDirection: vec2(1.0, 1.0)
// uColor1: #6366f1 (Indigo)
// uColor2: #8b5cf6 (Purple)
// uColor3: #06b6d4 (Cyan)
// uColor4: #10b981 (Emerald)
// uAnimationSpeed: 0.3

// Gradiente de Pago (radial):
// uGradientType: 1
// uCenter: vec2(0.5, 0.5)
// uRadius: 0.8
// uColor1: #059669 (Emerald-600)
// uColor2: #0d9488 (Teal-600)
// uColor3: #0891b2 (Sky-600)
// uColor4: #2563eb (Blue-600)

// Gradiente de Error (angular):
// uGradientType: 2
// uAngle: 0.0
// uColor1: #dc2626 (Red-600)
// uColor2: #ea580c (Orange-600)
// uColor3: #d97706 (Amber-600)
// uColor4: #dc2626 (Red-600)
// uAnimationSpeed: 0.8

// Gradiente Orgánico (ruido):
// uGradientType: 3
// uNoiseScale: 8.0
// uColor1: #1e293b (Slate-800)
// uColor2: #475569 (Slate-600)
// uColor3: #64748b (Slate-500)
// uColor4: #94a3b8 (Slate-400)
// uAnimationSpeed: 0.1

// Gradiente de Ondas (wave):
// uGradientType: 4
// uWaveFrequency: 12.0
// uWaveAmplitude: 0.3
// uColor1: #0f172a (Slate-900)
// uColor2: #1e40af (Blue-700)
// uColor3: #7c3aed (Violet-600)
// uColor4: #be185d (Pink-700)
// uAnimationSpeed: 0.5