// wobble.glsl
// Shader de efectos wobble para elementos 3D
// Crea efectos de ondulación y distorsión suaves

// ============================================================================
// VERTEX SHADER
// ============================================================================

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying float vWobble;

uniform float uTime;
uniform float uPositionFrequency;
uniform float uTimeFrequency;
uniform float uStrength;
uniform float uWarpFrequency;
uniform float uWarpStrength;

// Función de ruido simplex para variaciones orgánicas
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec3 permute(vec3 x) {
    return mod(((x*34.0)+1.0)*x, 289.0);
}

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec3 biTangent = normalize(cross(normal, tangent.xyz));
    
    // Calcular el efecto wobble usando noise
    float wobbleX = snoise(vec2(position.y * uPositionFrequency, uTime * uTimeFrequency));
    float wobbleY = snoise(vec2(position.z * uPositionFrequency + 123.0, uTime * uTimeFrequency));
    float wobbleZ = snoise(vec2(position.x * uPositionFrequency + 456.0, uTime * uTimeFrequency));
    
    vec3 wobble = vec3(wobbleX, wobbleY, wobbleZ) * uStrength;
    
    // Aplicar warp adicional para mayor complejidad
    float warpX = snoise(vec2(position.y * uWarpFrequency, uTime * uTimeFrequency * 0.5)) * uWarpStrength;
    float warpY = snoise(vec2(position.z * uWarpFrequency + 789.0, uTime * uTimeFrequency * 0.5)) * uWarpStrength;
    float warpZ = snoise(vec2(position.x * uWarpFrequency + 321.0, uTime * uTimeFrequency * 0.5)) * uWarpStrength;
    
    vec3 warp = vec3(warpX, warpY, warpZ);
    
    // Combinar efectos
    vec3 finalWobble = wobble + warp;
    
    // Posición final
    vec3 newPosition = position + finalWobble;
    
    // Calcular nueva normal para iluminación correcta
    vec3 tangentWobble = wobble + warp * 0.1;
    vec3 biTangentWobble = wobble + warp * 0.1;
    vec3 newNormal = normalize(cross(tangent.xyz + tangentWobble, biTangent + biTangentWobble));
    
    // Pasar variables al fragment shader
    vUv = uv;
    vPosition = newPosition;
    vNormal = newNormal;
    vWobble = length(finalWobble);
    
    // Transformación final
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}

// ============================================================================
// FRAGMENT SHADER
// ============================================================================

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying float vWobble;

uniform float uTime;
uniform vec3 uColorStart;
uniform vec3 uColorEnd;
uniform float uOpacity;
uniform float uMetalness;
uniform float uRoughness;
uniform float uEmissiveStrength;
uniform bool uWireframe;

// Función para mapear valores
float remap(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

void main() {
    // Color base interpolado
    float colorMix = remap(vWobble, 0.0, 1.0, 0.0, 1.0);
    vec3 color = mix(uColorStart, uColorEnd, colorMix);
    
    // Efecto de fresnel para bordes brillantes
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = 1.0 - max(0.0, dot(vNormal, viewDirection));
    
    // Color emissivo basado en wobble
    vec3 emissive = color * vWobble * uEmissiveStrength;
    
    // Iluminación básica
    vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
    float NdotL = max(0.0, dot(vNormal, lightDirection));
    
    // Color final
    vec3 finalColor = color * (0.3 + 0.7 * NdotL) + emissive + fresnel * 0.2;
    
    // Efecto wireframe
    if (uWireframe) {
        vec2 grid = abs(fract(vUv * 20.0) - 0.5);
        float line = smoothstep(0.0, 0.05, min(grid.x, grid.y));
        finalColor = mix(finalColor, vec3(1.0), 1.0 - line);
    }
    
    // Aplicar opacidad con fade suave en los bordes
    float alpha = uOpacity * (1.0 - fresnel * 0.3);
    
    gl_FragColor = vec4(finalColor, alpha);
}

// ============================================================================
// CONFIGURACIONES DE USO
// ============================================================================

// Uniforms recomendados para diferentes efectos:

// Wobble suave:
// uPositionFrequency: 0.5
// uTimeFrequency: 0.3
// uStrength: 0.1
// uWarpFrequency: 0.2
// uWarpStrength: 0.05

// Wobble intenso:
// uPositionFrequency: 1.5
// uTimeFrequency: 0.8
// uStrength: 0.3
// uWarpFrequency: 0.8
// uWarpStrength: 0.15

// Wobble oceánico:
// uPositionFrequency: 0.3
// uTimeFrequency: 0.2
// uStrength: 0.2
// uWarpFrequency: 0.1
// uWarpStrength: 0.1