import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  z: number;
  originX: number;
  originY: number;
  originZ: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  baseSize: number;
  sizePhase: number;
  color: string;
  depth: number;
  mass: number;
  brightness: number;
}

type AnimationMode = "normal";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 60 });
  const rotationRef = useRef({ x: 0.2, y: 0.3, vx: 0, vy: 0 });
  const zoomRef = useRef(1); // 확대/축소 배율
  const isDraggingRef = useRef(false); // 드래그 상태
  const lastMouseRef = useRef({ x: 0, y: 0 }); // 이전 마우스 위치
  const animationFrameRef = useRef<number>();
  const mouseDownTimeRef = useRef(0); // 마우스 다운 시간
  const mouseDownPosRef = useRef({ x: 0, y: 0 }); // 마우스 다운 위치
  const currentCharRef = useRef(0); // 현재 글자 인덱스 (0: ㅂ, 1: 白, 2: 百)
  const isMorphingRef = useRef(false); // 글자 변환 중인지 여부
  const chars = ["ㅂ", "白", "百"];

  const [mode, setMode] = useState<AnimationMode>("normal");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = [];

      if (canvas.width === 0 || canvas.height === 0) return;

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!tempCtx) return;

      // 각 글자마다 크기 조정 (비슷한 시각적 크기를 위해)
      const charScales = [1.35, 1.0, 1.0]; // ㅂ, 白, 百 (ㅂ을 1.5에서 1.35로 10% 감소)
      const currentScale = charScales[currentCharRef.current];

      const fontSize =
        Math.min(canvas.width, canvas.height) *
        0.585 *
        currentScale; // 0.45에서 0.585로 30% 증가
      if (fontSize <= 0) return;

      tempCanvas.width = fontSize;
      tempCanvas.height = fontSize;

      tempCtx.fillStyle = "white";
      tempCtx.font = `900 ${fontSize}px "Pretendard Variable", sans-serif`;
      tempCtx.textAlign = "center";
      tempCtx.textBaseline = "middle";
      tempCtx.fillText(
        chars[currentCharRef.current],
        fontSize / 2,
        fontSize / 2,
      );

      const imageData = tempCtx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height,
      );
      const pixels = imageData.data;

      const gap = 8; // 6에서 8로 증가하여 파티클 수 감소

      const particles: Particle[] = [];

      for (let y = 0; y < tempCanvas.height; y += gap) {
        for (let x = 0; x < tempCanvas.width; x += gap) {
          const index = (y * tempCanvas.width + x) * 4;
          if (pixels[index + 3] > 128) {
            const depth = (Math.random() - 0.5) * 150;

            const ox = x - tempCanvas.width / 2;
            const oy = y - tempCanvas.height / 2;
            const oz = depth;

            const depthNormalized = (depth + 75) / 150;
            const particleSize = 2.5 + Math.random() * 2;
            
            particles.push({
              x: ox,
              y: oy,
              z: oz,
              originX: ox,
              originY: oy,
              originZ: oz,
              vx: 0,
              vy: 0,
              vz: 0,
              size: particleSize,
              baseSize: particleSize,
              sizePhase: Math.random() * Math.PI * 2,
              color: "rgb(0, 0, 0)", // 블랙으로 변경
              depth: depthNormalized,
              mass: 1 + depthNormalized * 2,
              brightness: 0.5 + depthNormalized * 0.5,
            });
          }
        }
      }

      // 크기 순으로 정렬하여 상위 1%만 빨간색으로 변경
      const sortedBySize = [...particles].sort((a, b) => b.baseSize - a.baseSize);
      const top1PercentCount = Math.ceil(particles.length * 0.01);
      
      for (let i = 0; i < top1PercentCount; i++) {
        sortedBySize[i].color = "#D72626";
      }

      particlesRef.current = particles;
    };

    const morphToChar = (charIndex: number) => {
      if (canvas.width === 0 || canvas.height === 0) return;

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!tempCtx) return;

      // 각 글자마다 크기 조정
      const charScales = [1.35, 1.0, 1.0];
      const currentScale = charScales[charIndex];

      const fontSize =
        Math.min(canvas.width, canvas.height) *
        0.585 *
        currentScale; // 0.45에서 0.585로 30% 증가
      if (fontSize <= 0) return;

      tempCanvas.width = fontSize;
      tempCanvas.height = fontSize;

      tempCtx.fillStyle = "white";
      tempCtx.font = `900 ${fontSize}px "Pretendard Variable", sans-serif`;
      tempCtx.textAlign = "center";
      tempCtx.textBaseline = "middle";
      tempCtx.fillText(
        chars[charIndex],
        fontSize / 2,
        fontSize / 2,
      );

      const imageData = tempCtx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height,
      );
      const pixels = imageData.data;

      const gap = 8;
      const newPositions: Array<{
        x: number;
        y: number;
        z: number;
      }> = [];

      for (let y = 0; y < tempCanvas.height; y += gap) {
        for (let x = 0; x < tempCanvas.width; x += gap) {
          const index = (y * tempCanvas.width + x) * 4;
          if (pixels[index + 3] > 128) {
            const depth = (Math.random() - 0.5) * 150;
            const ox = x - tempCanvas.width / 2;
            const oy = y - tempCanvas.height / 2;
            const oz = depth;
            newPositions.push({ x: ox, y: oy, z: oz });
          }
        }
      }

      // 기존 파티클들의 목표 위치를 새로운 글자 형태로 변경
      const currentParticles = particlesRef.current;

      // 파티클 수가 다를 경우 처리
      if (newPositions.length > currentParticles.length) {
        // 새 글자가 더 많은 파티클 필요 - 파티클 추가
        for (
          let i = currentParticles.length;
          i < newPositions.length;
          i++
        ) {
          const newPos = newPositions[i];
          const depthNormalized = (newPos.z + 75) / 150;

          currentParticles.push({
            x: newPos.x,
            y: newPos.y,
            z: newPos.z,
            originX: newPos.x,
            originY: newPos.y,
            originZ: newPos.z,
            vx: 0,
            vy: 0,
            vz: 0,
            size: 2.5 + Math.random() * 2,
            baseSize: 2.5 + Math.random() * 2,
            sizePhase: Math.random() * Math.PI * 2,
            color: "rgb(0, 0, 0)",
            depth: depthNormalized,
            mass: 1 + depthNormalized * 2,
            brightness: 0.5 + depthNormalized * 0.5,
          });
        }
      } else if (
        newPositions.length < currentParticles.length
      ) {
        // 파티클이 너무 많으면 제거
        particlesRef.current = currentParticles.slice(
          0,
          newPositions.length,
        );
      }

      // 모든 파티클들을 새로운 위치로 즉시 이동
      for (
        let i = 0;
        i <
        Math.min(currentParticles.length, newPositions.length);
        i++
      ) {
        const particle = currentParticles[i];
        const newPos = newPositions[i];
        particle.x = newPos.x;
        particle.y = newPos.y;
        particle.z = newPos.z;
        particle.originX = newPos.x;
        particle.originY = newPos.y;
        particle.originZ = newPos.z;
        particle.vx = 0;
        particle.vy = 0;
        particle.vz = 0;
        const depthNormalized = (newPos.z + 75) / 150;
        particle.depth = depthNormalized;
        particle.mass = 1 + depthNormalized * 2;
        particle.brightness = 0.5 + depthNormalized * 0.5;
      }
    };

    const animate = () => {
      ctx.fillStyle = "rgb(255, 255, 255)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // 회전 속도를 항상 적용 (관성 효과)
      rotationRef.current.vx *= 0.98; // 감쇠 계수
      rotationRef.current.vy *= 0.98;

      // 드래그 중이 아닐 때만 최소 회전 속도 유지
      if (!isDraggingRef.current) {
        const minVelocity = 0.001;
        if (Math.abs(rotationRef.current.vx) < minVelocity) {
          rotationRef.current.vx =
            rotationRef.current.vx >= 0
              ? minVelocity
              : -minVelocity;
        }
        if (Math.abs(rotationRef.current.vy) < minVelocity) {
          rotationRef.current.vy =
            rotationRef.current.vy >= 0
              ? minVelocity
              : -minVelocity;
        }
      }

      rotationRef.current.x += rotationRef.current.vx;
      rotationRef.current.y += rotationRef.current.vy;

      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;
      const zoom = zoomRef.current;

      const sortedParticles = [...particlesRef.current].sort(
        (a, b) => {
          // 3D 회전 후 z 값으로 정렬
          const za =
            a.y * Math.sin(rotX) + a.z * Math.cos(rotX);
          const zb =
            b.y * Math.sin(rotX) + b.z * Math.cos(rotX);
          return zb - za;
        },
      );

      const mouse = mouseRef.current;
      const time = Date.now() * 0.001;

      for (let i = 0; i < sortedParticles.length; i++) {
        const particle = sortedParticles[i];

        // 파티클 크기를 랜덤하게 변화
        particle.sizePhase += 0.02 + Math.random() * 0.03;
        particle.size =
          particle.baseSize +
          Math.sin(particle.sizePhase) *
            particle.baseSize *
            0.8;

        // 3D 회전
        let x = particle.x;
        let y = particle.y;
        let z = particle.z;

        // Y축 회전
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // X축 회전
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const y1 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // 투영 (줌 적용)
        const perspective = 600;
        const scale = (perspective / (perspective + z2)) * zoom;

        // 카메라 뒤에 있는 파티클은 렌더링하지 않음
        if (z2 > perspective - 100 || scale <= 0) continue;

        const screenX = centerX + x1 * scale;
        const screenY = centerY + y1 * scale;

        // 물리 효과 - 마우스 밀어내기 (더 강력하게)
        const dx = mouse.x - screenX;
        const dy = mouse.y - screenY;
        const distanceSq = dx * dx + dy * dy;
        const radiusSq = mouse.radius * mouse.radius;

        if (distanceSq < radiusSq && distanceSq > 0) {
          const distance = Math.sqrt(distanceSq);
          const force =
            (mouse.radius - distance) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          const repulsion = force * force * 6; // 12에서 6으로 50% 감소
          particle.vx -=
            (Math.cos(angle) * repulsion) / particle.mass;
          particle.vy -=
            (Math.sin(angle) * repulsion) / particle.mass;
        }

        // 원래 위치로 복원 (텐션)
        particle.vx += (particle.originX - particle.x) * 0.008;
        particle.vy += (particle.originY - particle.y) * 0.008;
        particle.vz += (particle.originZ - particle.z) * 0.008;

        particle.vx *= 0.97;
        particle.vy *= 0.97;
        particle.vz *= 0.97;

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.z += particle.vz;

        // 파티클 그리기
        const finalSize = particle.size * scale;

        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, finalSize, 0, Math.PI * 2);
        ctx.fill();

        // 좌표값 표시 (일부 파티클만, 예술적 효과)
        if (i % 50 === 0 && scale > 0.5) {
          const coordText = `${Math.round(particle.x)}, ${Math.round(particle.y)}, ${Math.round(particle.z)}`;

          // 좌우상하로 더 넓고 랜덤하게 배치
          const seedX = Math.sin(i * 12.9898) * 43758.5453; // pseudo-random seed
          const seedY = Math.cos(i * 78.233) * 43758.5453;
          const baseOffsetX =
            (seedX - Math.floor(seedX) - 0.5) * 120; // -60 ~ 60
          const baseOffsetY =
            (seedY - Math.floor(seedY) - 0.5) * 100; // -50 ~ 50

          const offsetX =
            baseOffsetX + Math.sin(time * 0.3 + i * 0.5) * 20;
          const offsetY =
            baseOffsetY + Math.cos(time * 0.4 + i * 0.3) * 20;

          // 글자 크기도 다양하게
          const fontSize =
            7 + Math.abs(Math.sin(time * 0.4 + i)) * 5;
          ctx.font = `${fontSize}px monospace`;

          // 좌표 텍스트를 검정색으로 고정
          ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + Math.sin(time + i * 0.1) * 0.2})`;
          ctx.fillText(
            coordText,
            screenX + offsetX,
            screenY + offsetY,
          );

          // 좌표에서 파티클로 선 연결
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(
            screenX + offsetX - 5,
            screenY + offsetY + 2,
          );
          ctx.stroke();
        }
      }

      animationFrameRef.current =
        requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      // 드래그 중일 때 속도 업데이트 (가속도 적용)
      if (isDraggingRef.current) {
        const deltaX = e.clientX - lastMouseRef.current.x;
        const deltaY = e.clientY - lastMouseRef.current.y;

        // 드래그 속도를 velocity에 누적 (관성 효과)
        rotationRef.current.vy += deltaX * 0.0008; // 가속도 누적
        rotationRef.current.vx += deltaY * 0.0008;

        // velocity 제한 (너무 빠르게 회전하지 않도록)
        const maxVelocity = 0.05;
        rotationRef.current.vx = Math.max(
          -maxVelocity,
          Math.min(maxVelocity, rotationRef.current.vx),
        );
        rotationRef.current.vy = Math.max(
          -maxVelocity,
          Math.min(maxVelocity, rotationRef.current.vy),
        );

        lastMouseRef.current.x = e.clientX;
        lastMouseRef.current.y = e.clientY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current.x = e.clientX;
      lastMouseRef.current.y = e.clientY;
      mouseDownTimeRef.current = Date.now();
      mouseDownPosRef.current.x = e.clientX;
      mouseDownPosRef.current.y = e.clientY;
    };

    const handleMouseUp = (e: MouseEvent) => {
      isDraggingRef.current = false;
      const currentTime = Date.now();
      const currentPos = { x: e.clientX, y: e.clientY };
      const timeDiff = currentTime - mouseDownTimeRef.current;
      const posDiffX = currentPos.x - mouseDownPosRef.current.x;
      const posDiffY = currentPos.y - mouseDownPosRef.current.y;
      const distance = Math.sqrt(
        posDiffX * posDiffX + posDiffY * posDiffY,
      );

      // 짧은 시간 동안 작은 이동이면 클릭으로 간주
      if (timeDiff < 200 && distance < 5) {
        currentCharRef.current =
          (currentCharRef.current + 1) % chars.length;
        morphToChar(currentCharRef.current);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // 휠로 확대/축소
      const zoomSpeed = 0.001;
      zoomRef.current *= 1 - e.deltaY * zoomSpeed;
      // 줌 범위 제한
      zoomRef.current = Math.max(
        0.3,
        Math.min(3, zoomRef.current),
      );
    };

    const handleClick = () => {
      // 클릭 시 모였다가 폭발
      if (mode === "normal") {
        modeRef.current = "gathering";
        setMode("gathering");
        modeTimerRef.current = 0;

        // 일정 시간 후 자동으로 폭발
        setTimeout(() => {
          if (modeRef.current === "gathering") {
            modeRef.current = "returning";
            setMode("returning");
            modeTimerRef.current = 0;
          }
        }, 1500);
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    canvas.addEventListener("mouseleave", handleMouseLeave);

    resize();
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener(
        "mouseleave",
        handleMouseLeave,
      );
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="size-full bg-white overflow-hidden relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-pointer"
      />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-black/40 text-sm font-['Pretendard_Variable',sans-serif] text-center">
        드래그로 회전 • 휠로 확대/축소 • 마우스 호버로 밀어내기
        • 클릭으로 글자 변경
      </div>
    </div>
  );
}