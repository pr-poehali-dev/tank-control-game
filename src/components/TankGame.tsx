
import { useEffect, useRef, useState } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Bullet {
  x: number;
  y: number;
  angle: number;
  speed: number;
  active: boolean;
}

const TankGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tank, setTank] = useState<Position & { angle: number }>({ x: 250, y: 250, angle: 0 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});

  // Настройка размера канваса при монтировании
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = Math.min(800, window.innerWidth - 40);
        canvasRef.current.height = Math.min(600, window.innerHeight - 100);
        
        // Установка танка в центр при изменении размера
        setTank(prev => ({
          x: canvasRef.current!.width / 2,
          y: canvasRef.current!.height / 2,
          angle: prev.angle
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Обработка нажатий клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Обработка клика мыши (выстрел)
  useEffect(() => {
    const handleClick = () => {
      const newBullet: Bullet = {
        x: tank.x + 20 * Math.cos(tank.angle),
        y: tank.y + 20 * Math.sin(tank.angle),
        angle: tank.angle,
        speed: 5,
        active: true
      };
      
      setBullets(prev => [...prev, newBullet]);
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleClick);
      return () => canvas.removeEventListener('click', handleClick);
    }
  }, [tank]);

  // Игровой цикл
  useEffect(() => {
    const gameLoop = () => {
      if (!canvasRef.current) return;
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      
      const canvas = canvasRef.current;
      const width = canvas.width;
      const height = canvas.height;
      
      // Очистка канваса
      ctx.clearRect(0, 0, width, height);
      
      // Рисуем фон в клеточку
      drawGrid(ctx, width, height);
      
      // Обновляем положение танка
      updateTankPosition();
      
      // Обновляем положение пуль
      updateBullets(width, height);
      
      // Рисуем танк
      drawTank(ctx);
      
      // Рисуем пули
      drawBullets(ctx);
    };
    
    const intervalId = setInterval(gameLoop, 16); // ~60 FPS
    return () => clearInterval(intervalId);
  }, [tank, bullets, keys]);

  // Функция отрисовки сетки фона
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Рисуем основную сетку
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // Рисуем клетки
    const gridSize = 20;
    
    // Горизонтальные линии
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Вертикальные линии
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Рисуем более толстые линии каждые 5 клеток
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    
    // Горизонтальные основные линии
    for (let y = 0; y <= height; y += gridSize * 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Вертикальные основные линии
    for (let x = 0; x <= width; x += gridSize * 5) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  };

  // Функция обновления положения танка
  const updateTankPosition = () => {
    // Если нет Canvas, выходим
    if (!canvasRef.current) return;
    
    const speed = 3;
    const rotationSpeed = 0.05;
    let newX = tank.x;
    let newY = tank.y;
    let newAngle = tank.angle;
    
    // Поворот танка
    if (keys['a'] || keys['arrowleft']) {
      newAngle -= rotationSpeed;
    }
    if (keys['d'] || keys['arrowright']) {
      newAngle += rotationSpeed;
    }
    
    // Движение вперед/назад
    if (keys['w'] || keys['arrowup']) {
      newX += Math.cos(newAngle) * speed;
      newY += Math.sin(newAngle) * speed;
    }
    if (keys['s'] || keys['arrowdown']) {
      newX -= Math.cos(newAngle) * speed;
      newY -= Math.sin(newAngle) * speed;
    }
    
    // Проверка границ экрана
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    const tankSize = 15; // примерный радиус танка
    
    newX = Math.max(tankSize, Math.min(canvasWidth - tankSize, newX));
    newY = Math.max(tankSize, Math.min(canvasHeight - tankSize, newY));
    
    setTank({ x: newX, y: newY, angle: newAngle });
  };

  // Функция обновления положения пуль
  const updateBullets = (width: number, height: number) => {
    setBullets(prev => 
      prev.map(bullet => {
        // Перемещаем пулю в соответствии с её скоростью и углом
        const newX = bullet.x + Math.cos(bullet.angle) * bullet.speed;
        const newY = bullet.y + Math.sin(bullet.angle) * bullet.speed;
        
        // Проверяем, не вышла ли пуля за границы экрана
        if (newX < 0 || newX > width || newY < 0 || newY > height) {
          return { ...bullet, active: false };
        }
        
        return { ...bullet, x: newX, y: newY };
      }).filter(bullet => bullet.active)
    );
  };

  // Функция отрисовки танка
  const drawTank = (ctx: CanvasRenderingContext2D) => {
    const { x, y, angle } = tank;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Корпус танка
    ctx.fillStyle = 'green';
    ctx.fillRect(-15, -10, 30, 20);
    
    // Башня танка
    ctx.fillStyle = 'darkgreen';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Пушка танка
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    
    ctx.restore();
  };

  // Функция отрисовки пуль
  const drawBullets = (ctx: CanvasRenderingContext2D) => {
    bullets.forEach(bullet => {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  return (
    <div className="flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        className="border-2 border-gray-800 shadow-lg cursor-crosshair" 
        tabIndex={0}
      />
      <div className="fixed bottom-4 left-4 bg-white bg-opacity-70 p-2 rounded-md shadow-md text-sm">
        <p>Управление: WASD или стрелки</p>
        <p>Стрельба: левая кнопка мыши</p>
      </div>
    </div>
  );
};

export default TankGame;
