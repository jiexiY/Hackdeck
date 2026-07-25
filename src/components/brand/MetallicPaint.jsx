import { useCallback, useEffect, useRef, useState } from "react"

import "./metallic-paint.css"

const vertexShader = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 vP;
void main(){vP=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`

const fragmentShader = `#version 300 es
precision highp float;
in vec2 vP;
out vec4 oC;
uniform sampler2D u_tex;
uniform float u_time,u_ratio,u_imgRatio,u_seed,u_scale,u_refract,u_blur,u_liquid;
uniform float u_bright,u_contrast,u_angle,u_fresnel,u_sharp,u_wave,u_noise,u_chroma;
uniform float u_distort,u_contour;
uniform vec3 u_lightColor,u_darkColor,u_tint;

vec3 sC,sM;

vec3 pW(vec3 v){
  vec3 i=floor(v),f=fract(v),s=sign(fract(v*.5)-.5),h=fract(sM*i+i.yzx),c=f*(f-1.);
  return s*c*((h*16.-4.)*c-1.);
}

vec3 aF(vec3 b,vec3 c){return pW(b+c.zxy-pW(b.zxy+c.yzx)+pW(b.yzx+c.xyz));}
vec3 lM(vec3 s,vec3 p){return(p+aF(s,p))*.5;}

vec2 fA(){
  vec2 c=vP-.5;
  c.x*=u_ratio>u_imgRatio?u_ratio/u_imgRatio:1.;
  c.y*=u_ratio>u_imgRatio?1.:u_imgRatio/u_ratio;
  return vec2(c.x+.5,.5-c.y);
}

vec2 rot(vec2 p,float r){float c=cos(r),s=sin(r);return vec2(p.x*c+p.y*s,p.y*c-p.x*s);}

float bM(vec2 c,float t){
  vec2 l=smoothstep(vec2(0.),vec2(t),c),u=smoothstep(vec2(0.),vec2(t),1.-c);
  return l.x*l.y*u.x*u.y;
}

float mG(float hi,float lo,float t,float sh,float cv){
  sh*=(2.-u_sharp);
  float ci=smoothstep(.15,.85,cv),r=lo;
  float e1=.08/u_scale;
  r=mix(r,hi,smoothstep(0.,sh*1.5,t));
  r=mix(r,lo,smoothstep(e1-sh,e1+sh,t));
  float e2=e1+.05/u_scale*(1.-ci*.35);
  r=mix(r,hi,smoothstep(e2-sh,e2+sh,t));
  float e3=e2+.025/u_scale*(1.-ci*.45);
  r=mix(r,lo,smoothstep(e3-sh,e3+sh,t));
  float e4=e1+.1/u_scale;
  r=mix(r,hi,smoothstep(e4-sh,e4+sh,t));
  float rm=1.-e4,gT=clamp((t-e4)/rm,0.,1.);
  r=mix(r,mix(hi,lo,smoothstep(0.,1.,gT)),smoothstep(e4-sh*.5,e4+sh*.5,t));
  return r;
}

void main(){
  sC=fract(vec3(.7548,.5698,.4154)*(u_seed+17.31))+.5;
  sM=fract(sC.zxy-sC.yzx*1.618);
  vec2 sc=vec2(vP.x*u_ratio,1.-vP.y);
  float angleRad=u_angle*3.14159/180.;
  sc=rot(sc-.5,angleRad)+.5;
  sc=clamp(sc,0.,1.);
  float sl=sc.x-sc.y,an=u_time*.001;
  vec2 iC=fA();
  vec4 texSample=texture(u_tex,iC);
  float dp=texSample.r;
  float shapeMask=texSample.a;
  if(shapeMask<.01)discard;
  vec3 hi=u_lightColor*u_bright;
  vec3 lo=u_darkColor*(2.-u_bright);
  lo.b+=smoothstep(.6,1.4,sc.x+sc.y)*.08;
  vec2 fC=sc-.5;
  float rd=length(fC+vec2(0.,sl*.15));
  vec2 ag=rot(fC,(.22-sl*.18)*3.14159);
  float cv=1.-pow(rd*1.65,1.15);
  cv*=pow(sc.y,.35);
  float vs=shapeMask;
  vs*=bM(iC,.01);
  float fr=pow(1.-cv,u_fresnel)*.3;
  vs=min(vs+fr*vs,1.);
  float mT=an*.0625;
  vec3 wO=vec3(-1.05,1.35,1.55);
  vec3 wA=aF(vec3(31.,73.,56.),mT+wO)*.22*u_wave;
  vec3 wB=aF(vec3(24.,64.,42.),mT-wO.yzx)*.22*u_wave;
  vec2 nC=sc*45.*u_noise;
  nC+=aF(sC.zxy,an*.17*sC.yzx-sc.yxy*.35).xy*18.*u_wave;
  vec3 tC=vec3(.00041,.00053,.00076)*mT+wB*nC.x+wA*nC.y;
  tC=lM(sC,tC);
  tC=lM(sC+1.618,tC);
  float tb=sin(tC.x*3.14159)*.5+.5;
  tb=tb*2.-1.;
  float noiseVal=pW(vec3(sc*8.+an,an*.5)).x;
  float edgeFactor=smoothstep(0.,.5,dp)*smoothstep(1.,.5,dp);
  float lD=dp+(1.-dp)*u_liquid*tb;
  lD+=noiseVal*u_distort*.15*edgeFactor;
  float rB=clamp(1.-cv,0.,1.);
  float fl=ag.x+sl;
  fl+=noiseVal*sl*u_distort*edgeFactor;
  fl*=mix(1.,1.-dp*.5,u_contour);
  fl-=dp*u_contour*.8;
  float eI=smoothstep(0.,1.,lD)*smoothstep(1.,0.,lD);
  fl-=tb*sl*1.8*eI;
  float cA=cv*clamp(pow(sc.y,.12),.25,1.);
  fl*=.12+(1.05-lD)*cA;
  fl*=smoothstep(1.,.65,lD);
  float vA1=smoothstep(.08,.18,sc.y)*smoothstep(.38,.18,sc.y);
  float vA2=smoothstep(.08,.18,1.-sc.y)*smoothstep(.38,.18,1.-sc.y);
  fl+=vA1*.16+vA2*.025;
  fl*=.45+pow(sc.y,2.)*.55;
  fl*=u_scale;
  fl-=an;
  float rO=rB+cv*tb*.025;
  float vM1=smoothstep(-.12,.18,sc.y)*smoothstep(.48,.08,sc.y);
  float cM1=smoothstep(.35,.55,cv)*smoothstep(.95,.35,cv);
  rO+=vM1*cM1*4.5;
  rO-=sl;
  float bO=rB*1.25;
  float vM2=smoothstep(-.02,.35,sc.y)*smoothstep(.75,.08,sc.y);
  float cM2=smoothstep(.35,.55,cv)*smoothstep(.75,.35,cv);
  bO+=vM2*cM2*.9;
  bO-=lD*.18;
  rO*=u_refract*u_chroma;
  bO*=u_refract*u_chroma;
  float sf=u_blur;
  float rP=fract(fl+rO);
  float rC=mG(hi.r,lo.r,rP,sf+.018+u_refract*cv*.025,cv);
  float gP=fract(fl);
  float gC=mG(hi.g,lo.g,gP,sf+.008/max(.01,1.-sl),cv);
  float bP=fract(fl-bO);
  float bC=mG(hi.b,lo.b,bP,sf+.008,cv);
  vec3 col=vec3(rC,gC,bC);
  col=(col-.5)*u_contrast+.5;
  col=clamp(col,0.,1.);
  col=mix(col,1.-min(vec3(1.),(1.-col)/max(u_tint,vec3(.001))),length(u_tint-1.)*.5);
  col=clamp(col,0.,1.);
  oC=vec4(col*vs,vs);
}`

function processImage(img) {
  const MAX_SIZE = 1000
  const MIN_SIZE = 500
  let width = img.naturalWidth || img.width
  let height = img.naturalHeight || img.height

  if (width > MAX_SIZE || height > MAX_SIZE || width < MIN_SIZE || height < MIN_SIZE) {
    const scale = width > height
      ? width > MAX_SIZE ? MAX_SIZE / width : width < MIN_SIZE ? MIN_SIZE / width : 1
      : height > MAX_SIZE ? MAX_SIZE / height : height < MIN_SIZE ? MIN_SIZE / height : 1
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, width, height)

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const size = width * height
  const alphaValues = new Float32Array(size)
  const shapeMask = new Uint8Array(size)
  const boundaryMask = new Uint8Array(size)

  for (let i = 0; i < size; i += 1) {
    const idx = i * 4
    const isBackground = (data[idx] > 250 && data[idx + 1] > 250 && data[idx + 2] > 250 && data[idx + 3] === 255) || data[idx + 3] < 5
    alphaValues[i] = isBackground ? 0 : data[idx + 3] / 255
    shapeMask[i] = alphaValues[i] > 0.1 ? 1 : 0
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x
      if (!shapeMask[idx]) continue
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1 || !shapeMask[idx - 1] || !shapeMask[idx + 1] || !shapeMask[idx - width] || !shapeMask[idx + width]) {
        boundaryMask[idx] = 1
      }
    }
  }

  const u = new Float32Array(size)
  const ITERATIONS = 200
  const C = 0.01
  const omega = 1.85

  for (let iter = 0; iter < ITERATIONS; iter += 1) {
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const idx = y * width + x
        if (!shapeMask[idx] || boundaryMask[idx]) continue
        const sum =
          (shapeMask[idx + 1] ? u[idx + 1] : 0) +
          (shapeMask[idx - 1] ? u[idx - 1] : 0) +
          (shapeMask[idx + width] ? u[idx + width] : 0) +
          (shapeMask[idx - width] ? u[idx - width] : 0)
        const next = (C + sum) / 4
        u[idx] = omega * next + (1 - omega) * u[idx]
      }
    }
  }

  let maxVal = 0
  for (let i = 0; i < size; i += 1) if (u[i] > maxVal) maxVal = u[i]
  if (maxVal === 0) maxVal = 1

  const output = ctx.createImageData(width, height)
  for (let i = 0; i < size; i += 1) {
    const px = i * 4
    const depth = u[i] / maxVal
    const gray = Math.round(255 * (1 - depth * depth))
    output.data[px] = gray
    output.data[px + 1] = gray
    output.data[px + 2] = gray
    output.data[px + 3] = Math.round(alphaValues[i] * 255)
  }

  return output
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [1, 1, 1]
}

export default function MetallicPaint({
  imageSrc,
  seed = 42,
  scale = 4,
  refraction = 0.01,
  blur = 0.015,
  liquid = 0.75,
  speed = 0.3,
  brightness = 2,
  contrast = 0.5,
  angle = 0,
  fresnel = 1,
  lightColor = "#ffffff",
  darkColor = "#000000",
  patternSharpness = 1,
  waveAmplitude = 1,
  noiseScale = 0.5,
  chromaticSpread = 2,
  mouseAnimation = false,
  distortion = 1,
  contour = 0.2,
  tintColor = "#f1f7f2",
  ariaLabel = "",
  className = "",
  style,
}) {
  const canvasRef = useRef(null)
  const glRef = useRef(null)
  const programRef = useRef(null)
  const bufferRef = useRef(null)
  const uniformsRef = useRef({})
  const textureRef = useRef(null)
  const animationTimeRef = useRef(0)
  const lastTimeRef = useRef(0)
  const rafRef = useRef(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 })
  const [ready, setReady] = useState(false)
  const [textureReady, setTextureReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const initGL = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true })
    if (!gl) return false

    const compile = (source, type) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        if (import.meta.env.DEV && !gl.isContextLost()) {
          console.warn("HACKdeck metallic wordmark shader did not compile", gl.getShaderInfoLog(shader))
        }
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertex = compile(vertexShader, gl.VERTEX_SHADER)
    const fragment = compile(fragmentShader, gl.FRAGMENT_SHADER)
    if (!vertex || !fragment) return false

    const program = gl.createProgram()
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (import.meta.env.DEV && !gl.isContextLost()) {
        console.warn("HACKdeck metallic wordmark shader did not link", gl.getProgramInfoLog(program))
      }
      gl.deleteProgram(program)
      return false
    }

    const uniforms = {}
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    for (let index = 0; index < uniformCount; index += 1) {
      const info = gl.getActiveUniform(program, index)
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.useProgram(program)
    const position = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    glRef.current = gl
    programRef.current = program
    bufferRef.current = buffer
    uniformsRef.current = uniforms
    return true
  }, [])

  const uploadTexture = useCallback((imageData) => {
    const gl = glRef.current
    const uniforms = uniformsRef.current
    if (!gl || !imageData) return
    if (textureRef.current) gl.deleteTexture(textureRef.current)
    const texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageData.width, imageData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data)
    gl.uniform1i(uniforms.u_tex, 0)
    gl.uniform1f(uniforms.u_imgRatio, imageData.width / imageData.height)
    textureRef.current = texture
  }, [])

  useEffect(() => {
    if (!initGL()) {
      setFailed(true)
      return undefined
    }

    const canvas = canvasRef.current
    const gl = glRef.current
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(rect.width * dpr))
      const height = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
      gl.uniform1f(uniformsRef.current.u_ratio, rect.width / Math.max(rect.height, 1))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    setReady(true)

    return () => {
      observer.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (textureRef.current) gl.deleteTexture(textureRef.current)
      if (bufferRef.current) gl.deleteBuffer(bufferRef.current)
      if (programRef.current) gl.deleteProgram(programRef.current)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [initGL])

  useEffect(() => {
    if (!ready || !imageSrc) return undefined
    let active = true
    setTextureReady(false)
    const image = new Image()
    image.onload = () => {
      if (!active) return
      try {
        uploadTexture(processImage(image))
        setTextureReady(true)
      } catch (error) {
        if (import.meta.env.DEV) console.warn("HACKdeck metallic wordmark mask could not be processed", error)
        setFailed(true)
      }
    }
    image.onerror = () => {
      if (!active) return
      if (import.meta.env.DEV) console.warn("HACKdeck metallic wordmark mask could not be loaded")
      setFailed(true)
    }
    image.src = imageSrc
    return () => { active = false }
  }, [imageSrc, ready, uploadTexture])

  useEffect(() => {
    const gl = glRef.current
    const uniforms = uniformsRef.current
    if (!gl || !ready) return
    gl.uniform1f(uniforms.u_seed, seed)
    gl.uniform1f(uniforms.u_scale, scale)
    gl.uniform1f(uniforms.u_refract, refraction)
    gl.uniform1f(uniforms.u_blur, blur)
    gl.uniform1f(uniforms.u_liquid, liquid)
    gl.uniform1f(uniforms.u_bright, brightness)
    gl.uniform1f(uniforms.u_contrast, contrast)
    gl.uniform1f(uniforms.u_angle, angle)
    gl.uniform1f(uniforms.u_fresnel, fresnel)
    gl.uniform1f(uniforms.u_sharp, patternSharpness)
    gl.uniform1f(uniforms.u_wave, waveAmplitude)
    gl.uniform1f(uniforms.u_noise, noiseScale)
    gl.uniform1f(uniforms.u_chroma, chromaticSpread)
    gl.uniform1f(uniforms.u_distort, distortion)
    gl.uniform1f(uniforms.u_contour, contour)
    const light = hexToRgb(lightColor)
    const dark = hexToRgb(darkColor)
    const tint = hexToRgb(tintColor)
    gl.uniform3f(uniforms.u_lightColor, ...light)
    gl.uniform3f(uniforms.u_darkColor, ...dark)
    gl.uniform3f(uniforms.u_tint, ...tint)
  }, [angle, blur, brightness, chromaticSpread, contour, contrast, darkColor, distortion, fresnel, lightColor, liquid, noiseScale, patternSharpness, ready, refraction, scale, seed, tintColor, waveAmplitude])

  useEffect(() => {
    if (!ready || !textureReady) return undefined
    const gl = glRef.current
    const uniforms = uniformsRef.current
    const canvas = canvasRef.current
    const mouse = mouseRef.current
    let active = true

    const handlePointerMove = (event) => {
      const rect = canvas.getBoundingClientRect()
      mouse.targetX = (event.clientX - rect.left) / rect.width
      mouse.targetY = (event.clientY - rect.top) / rect.height
    }
    if (mouseAnimation) canvas.addEventListener("pointermove", handlePointerMove)

    const render = (time) => {
      if (!active) return
      const delta = Math.min(time - lastTimeRef.current, 100)
      lastTimeRef.current = time
      if (mouseAnimation) {
        mouse.x += (mouse.targetX - mouse.x) * 0.08
        mouse.y += (mouse.targetY - mouse.y) * 0.08
        animationTimeRef.current = mouse.x * 3000 + mouse.y * 1500
      } else {
        animationTimeRef.current += delta * speed
      }
      gl.uniform1f(uniforms.u_time, animationTimeRef.current)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      if (speed > 0 || mouseAnimation) rafRef.current = requestAnimationFrame(render)
    }
    lastTimeRef.current = performance.now()
    render(lastTimeRef.current)

    return () => {
      active = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (mouseAnimation) canvas.removeEventListener("pointermove", handlePointerMove)
    }
  }, [mouseAnimation, ready, speed, textureReady])

  return (
    <canvas
      ref={canvasRef}
      className={`paint-container ${textureReady && !failed ? "is-ready" : ""}${className ? ` ${className}` : ""}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : "true"}
      style={style}
    />
  )
}
