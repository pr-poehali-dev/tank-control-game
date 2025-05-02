
import { useEffect, useRef, useState, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Tank extends Position {
  angle: number;
  alive: boolean;
  size: number;
}

interface Bullet {
  x: number;
  y: number;
  angle: number;
  speed: number;
  active: boolean;
  fromEnemy: boolean;  // Определяет, от кого пуля - от игрока или врага
}

interface Obstacle extends Position {
  width: number;
  height: number;
  destructible: boolean; // Можно ли разрушить препятствие
}

const TankGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const enemiesRef = useRef<Tank[]>([]);
  const [playerTank, setPlayerTank] = useState<Tank>({ 
    x: 100, 
    y: 300, 
    angle: 0, 
    alive: true, 
    size: 15 
  });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const [enemies, setEnemies] = useState<Tank[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [gameTime, setGameTime] = useState<string>("00:00");
  const [gameActive, setGameActive] = useState(true);
  const [waveCompleted, setWaveCompleted] = useState(false);
  const [newWaveCountdown, setNewWaveCountdown] = useState(0);

  // Синхронизация ref с состоянием
  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  // Создание препятствий и начало новой игры
  const initGame = useCallback(() => {
    if (!canvasRef.current) return;
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Создаем игровую базу в левой части карты
    const baseX = 50;
    const baseY = height / 2;
    const baseWidth = 100;
    const baseHeight = 100;
    
    // Создаем препятствия и базу игрока
    const newObstacles: Obstacle[] = [
      // База игрока - неразрушаемые стены
      { x: baseX - 30, y: baseY - 50, width: 10, height: 100, destructible: false }, // Левая стенка базы
      { x: baseX - 30, y: baseY - 50, width: 80, height: 10, destructible: false }, // Верхняя стенка базы
      { x: baseX - 30, y: baseY + 40, width: 80, height: 10, destructible: false }, // Нижняя стенка базы
      
      // Другие препятствия на карте
      { x: width * 0.4, y: height * 0.2, width: 40, height: 40, destructible: true },
      { x: width * 0.7, y: height * 0.2, width: 60, height: 30, destructible: true },
      { x: width * 0.4, y: height * 0.7, width: 60, height: 30, destructible: true },
      { x: width * 0.7, y: height * 0.7, width: 40, height: 40, destructible: true },
      { x: width * 0.5, y: height * 0.5, width: 50, height: 50, destructible: true },
    ];
    
    setObstacles(newObstacles);
    
    // Сбрасываем игровые данные и устанавливаем игрока в базу
    setPlayerTank({
      x: baseX + 20, // Внутри базы
      y: baseY,      // Центр базы
      angle: 0,
      alive: true,
      size: 15
    });
    
    setBullets([]);
    setWave(1);
    setScore(0);
    setGameOver(false);
    setStartTime(Date.now());
    setGameActive(true);
    setWaveCompleted(false);
    setNewWaveCountdown(0);
    
    // Генерируем первую волну противников
    setTimeout(() => {
      createEnemies(1);
    }, 500);
  }, []);

  // Создание противников для новой волны
  const createEnemies = useCallback((waveNumber: number) => {
    console.log(`СОЗДАЕМ ПРОТИВНИКОВ ДЛЯ ВОЛНЫ ${waveNumber}`);
    
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    
    const newEnemies: Tank[] = [];
    const enemyCount = waveNumber;
    
    for (let i = 0; i < enemyCount; i++) {
      let validPosition = false;
      let enemyX = 0;
      let enemyY = 0;
      let attempts = 0;
      
      // Пытаемся найти позицию, не пересекающуюся с препятствиями и игроком
      while (!validPosition && attempts < 100) {
        attempts++;
        // Спавним противников только в правой половине карты
        enemyX = width * 0.6 + Math.random() * (width * 0.35);
        enemyY = Math.random() * (height - 60) + 30;
        
        // Проверяем, достаточно ли далеко от игрока (минимум 200 пикселей)
        const distToPlayer = Math.hypot(enemyX - playerTank.x, enemyY - playerTank.y);
        if (distToPlayer < 200) continue;
        
        // Проверяем, не находится ли в препятствии
        let collidesWithObstacle = false;
        for (const obstacle of obstacles) {
          if (checkCollisionRect(
            { x: enemyX - 15, y: enemyY - 10, width: 30, height: 20 },
            { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height }
          )) {
            collidesWithObstacle = true;
            break;
          }
        }
        
        // Проверяем, не находится ли слишком близко к другим врагам
        let collidesWithEnemy = false;
        for (const enemy of newEnemies) {
          const distance = Math.hypot(enemyX - enemy.x, enemyY - enemy.y);
          if (distance < 40) {
            collidesWithEnemy = true;
            break;
          }
        }
        
        if (!collidesWithObstacle && !collidesWithEnemy) {
          validPosition = true;
        }
      }
      
      // Если после 100 попыток не удалось найти позицию, размещаем
      // танк в случайном месте правой части карты
      if (!validPosition) {
        enemyX = width * 0.7 + Math.random() * (width * 0.2);
        enemyY = Math.random() * (height - 100) + 50;
      }
      
      newEnemies.push({
        x: enemyX,
        y: enemyY,
        angle: Math.random() * Math.PI * 2,
        alive: true,
        size: 15
      });
    }
    
    console.log(`Создано ${newEnemies.length} противников`);
    setEnemies(newEnemies);
    setWaveCompleted(false);
  }, [playerTank, obstacles]);

  // Проверка на столкновение двух прямоугольников
  const checkCollisionRect = (rect1: { x: number, y: number, width: number, height: number }, 
                          rect2: { x: number, y: number, width: number, height: number }) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  };

  // Проверка на столкновение танка с пулей (упрощенно круги)
  const checkTankBulletCollision = (tank: Tank, bullet: Bullet) => {
    const distance = Math.hypot(tank.x - bullet.x, tank.y - bullet.y);
    return distance < tank.size + 3; // 3 - размер пули
  };

  // Настройка размера канваса при монтировании
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = Math.min(800, window.innerWidth - 40);
        canvasRef.current.height = Math.min(600, window.innerHeight - 100);
        initGame();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [initGame]);

  // Обработка нажатий клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: true }));
      
      // Рестарт игры на клавишу 'R'
      if (e.key.toLowerCase() === 'r' && gameOver) {
        initGame();
      }
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
  }, [gameOver, initGame]);

  // Обработка клика мыши (выстрел)
  useEffect(() => {
    const handleClick = () => {
      if (!playerTank.alive || !gameActive) return;
      
      const newBullet: Bullet = {
        x: playerTank.x + 20 * Math.cos(playerTank.angle),
        y: playerTank.y + 20 * Math.sin(playerTank.angle),
        angle: playerTank.angle,
        speed: 5,
        active: true,
        fromEnemy: false
      };
      
      setBullets(prev => [...prev, newBullet]);
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleClick);
      return () => canvas.removeEventListener('click', handleClick);
    }
  }, [playerTank, gameActive]);

  // Обновление игрового времени
  useEffect(() => {
    if (!gameActive) return;
    
    const timerInterval = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = Math.floor((currentTime - startTime) / 1000);
      const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
      const seconds = (elapsedTime % 60).toString().padStart(2, '0');
      setGameTime(`${minutes}:${seconds}`);
    }, 1000);
    
    return () => clearInterval(timerInterval);
  }, [startTime, gameActive]);

  // Функция для стрельбы врагов
  const enemyShoot = useCallback((enemy: Tank) => {
    if (!gameActive) return;
    
    const newBullet: Bullet = {
      x: enemy.x + 20 * Math.cos(enemy.angle),
      y: enemy.y + 20 * Math.sin(enemy.angle),
      angle: enemy.angle,
      speed: 4,
      active: true,
      fromEnemy: true
    };
    
    setBullets(prev => [...prev, newBullet]);
  }, [gameActive]);

  // Враги периодически стреляют
  useEffect(() => {
    if (!gameActive) return;
    
    const enemyShootInterval = setInterval(() => {
      enemiesRef.current.forEach(enemy => {
        if (enemy.alive && Math.random() < 0.1) { // 10% шанс выстрела каждую секунду
          enemyShoot(enemy);
        }
      });
    }, 1000);
    
    return () => clearInterval(enemyShootInterval);
  }, [enemyShoot, gameActive]);

  // Эффект для запуска новой волны после завершения текущей
  useEffect(() => {
    if (!gameActive || !waveCompleted) return;
    
    let countdownTimer: NodeJS.Timeout;
    
    if (newWaveCountdown > 0) {
      countdownTimer = setTimeout(() => {
        setNewWaveCountdown(prev => prev - 1);
      }, 1000);
    } else if (waveCompleted) {
      // Запускаем новую волну
      const nextWave = wave + 1;
      setWave(nextWave);
      setScore(prev => prev + 1);
      
      setTimeout(() => {
        console.log(`Начинаем волну ${nextWave}`);
        createEnemies(nextWave);
      }, 500);
    }
    
    return () => {
      if (countdownTimer) clearTimeout(countdownTimer);
    };
  }, [waveCompleted, newWaveCountdown, wave, gameActive, createEnemies]);

  // ИИ врага (простое преследование игрока)
  const updateEnemies = useCallback(() => {
    if (!canvasRef.current || !gameActive) return;
    
    const canvas = canvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    
    setEnemies(prev => 
      prev.map(enemy => {
        if (!enemy.alive) return enemy;
        
        // Поворачиваем пушку в сторону игрока
        const dx = playerTank.x - enemy.x;
        const dy = playerTank.y - enemy.y;
        let targetAngle = Math.atan2(dy, dx);
        
        // Плавный поворот
        let angleDiff = targetAngle - enemy.angle;
        // Нормализуем разницу углов
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        let newAngle = enemy.angle;
        // Ограничиваем скорость поворота
        if (Math.abs(angleDiff) > 0.05) {
          newAngle += Math.sign(angleDiff) * 0.03;
        } else {
          newAngle = targetAngle;
        }
        
        // Двигаемся в сторону игрока только если расстояние больше 100 пикселей
        const distance = Math.hypot(dx, dy);
        let newX = enemy.x;
        let newY = enemy.y;
        
        if (distance > 150) {
          const moveSpeed = 1.5; // Враги медленнее игрока
          newX += Math.cos(newAngle) * moveSpeed;
          newY += Math.sin(newAngle) * moveSpeed;
        }
        
        // Проверка на столкновение с препятствиями
        let hasCollision = false;
        for (const obstacle of obstacles) {
          if (checkCollisionRect(
            { x: newX - 15, y: newY - 10, width: 30, height: 20 },
            { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height }
          )) {
            hasCollision = true;
            break;
          }
        }
        
        // Проверка на столкновение с другими врагами
        prev.forEach(otherEnemy => {
          if (otherEnemy !== enemy && otherEnemy.alive) {
            const tankDistance = Math.hypot(newX - otherEnemy.x, newY - otherEnemy.y);
            if (tankDistance < 35) { // Минимальное расстояние между танками
              hasCollision = true;
            }
          }
        });
        
        // Проверка на столкновение с игроком
        if (playerTank.alive) {
          const playerDistance = Math.hypot(newX - playerTank.x, newY - playerTank.y);
          if (playerDistance < 35) {
            hasCollision = true;
          }
        }
        
        // Проверка границ экрана
        const tankSize = 15;
        newX = Math.max(tankSize, Math.min(width - tankSize, newX));
        newY = Math.max(tankSize, Math.min(height - tankSize, newY));
        
        // Если нет коллизий, обновляем позицию
        if (!hasCollision) {
          return { ...enemy, x: newX, y: newY, angle: newAngle };
        } else {
          // Если есть коллизия, обновляем только угол
          return { ...enemy, angle: newAngle };
        }
      })
    );
  }, [playerTank, obstacles, gameActive]);

  // Проверка завершения волны
  const checkWaveCompletion = useCallback(() => {
    // Проверяем, все ли враги уничтожены
    if (enemies.length > 0 && enemies.every(enemy => !enemy.alive) && !waveCompleted) {
      console.log("Волна завершена! Скоро начнется следующая...");
      setWaveCompleted(true);
      setNewWaveCountdown(3); // 3 секунды до следующей волны
    }
  }, [enemies, waveCompleted]);

  // Игровой цикл
  useEffect(() => {
    if (!gameActive) return;
    
    const runGameLoop = () => {
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
      
      // Рисуем препятствия
      drawObstacles(ctx);
      
      // Обновляем положение танка игрока, если он жив
      if (playerTank.alive) {
        updateTankPosition();
      }
      
      // Обновляем положение врагов
      updateEnemies();
      
      // Обновляем положение пуль и проверяем столкновения
      updateBullets(width, height);
      
      // Рисуем танк игрока
      if (playerTank.alive) {
        drawTank(ctx, playerTank, false);
      }
      
      // Рисуем вражеские танки
      enemies.forEach(enemy => {
        if (enemy.alive) {
          drawTank(ctx, enemy, true);
        }
      });
      
      // Рисуем пули
      drawBullets(ctx);
      
      // Отладочная информация
      ctx.fillStyle = 'black';
      ctx.font = '12px Arial';
      ctx.fillText(`Противников: ${enemies.length} (живых: ${enemies.filter(e => e.alive).length})`, 10, 20);
      
      // Проверка окончания волны
      checkWaveCompletion();
      
      // Рисуем сообщение о новой волне если необходимо
      if (waveCompleted && newWaveCountdown > 0) {
        drawNextWaveMessage(ctx, width, height);
      }
      
      // Продолжаем игровой цикл
      gameLoopRef.current = requestAnimationFrame(runGameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(runGameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [
    playerTank, 
    bullets, 
    keys, 
    enemies, 
    obstacles, 
    wave, 
    updateEnemies,
    checkWaveCompletion,
    waveCompleted,
    newWaveCountdown,
    gameActive
  ]);

  // Отрисовка сообщения о новой волне
  const drawNextWaveMessage = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(width / 2 - 150, height / 2 - 50, 300, 100);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Волна ${wave} завершена!`, width / 2, height / 2 - 15);
    ctx.fillText(`Следующая волна через ${newWaveCountdown}...`, width / 2, height / 2 + 20);
    ctx.restore();
  };

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

  // Функция отрисовки препятствий
  const drawObstacles = (ctx: CanvasRenderingContext2D) => {
    obstacles.forEach(obstacle => {
      // Неразрушаемые препятствия рисуем темнее
      ctx.fillStyle = obstacle.destructible ? '#777' : '#444';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      
      // Добавляем рамку для неразрушаемых препятствий
      if (!obstacle.destructible) {
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }
    });
  };

  // Функция обновления положения танка
  const updateTankPosition = () => {
    // Если нет Canvas или игрок мертв, выходим
    if (!canvasRef.current || !playerTank.alive || !gameActive) return;
    
    const speed = 3;
    const rotationSpeed = 0.05;
    let newX = playerTank.x;
    let newY = playerTank.y;
    let newAngle = playerTank.angle;
    
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
    
    // Проверка столкновения с препятствиями
    let hasCollision = false;
    for (const obstacle of obstacles) {
      if (checkCollisionRect(
        { x: newX - 15, y: newY - 10, width: 30, height: 20 },
        { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height }
      )) {
        hasCollision = true;
        break;
      }
    }
    
    // Проверка столкновения с врагами
    for (const enemy of enemies) {
      if (enemy.alive) {
        const distance = Math.hypot(newX - enemy.x, newY - enemy.y);
        if (distance < 35) { // Минимальное расстояние между танками
          hasCollision = true;
          break;
        }
      }
    }
    
    // Если нет коллизий, обновляем позицию
    if (!hasCollision) {
      setPlayerTank(prev => ({ ...prev, x: newX, y: newY, angle: newAngle }));
    } else {
      // Если есть коллизия, обновляем только угол
      setPlayerTank(prev => ({ ...prev, angle: newAngle }));
    }
  };

  // Функция обновления положения пуль и проверки столкновений
  const updateBullets = (width: number, height: number) => {
    if (!gameActive) return;
    
    setBullets(prev => {
      const updatedBullets = prev.map(bullet => {
        // Перемещаем пулю в соответствии с её скоростью и углом
        const newX = bullet.x + Math.cos(bullet.angle) * bullet.speed;
        const newY = bullet.y + Math.sin(bullet.angle) * bullet.speed;
        
        // Проверяем, не вышла ли пуля за границы экрана
        if (newX < 0 || newX > width || newY < 0 || newY > height) {
          return { ...bullet, active: false };
        }
        
        // Проверяем, не столкнулась ли пуля с препятствием
        let hitObstacle = false;
        obstacles.forEach(obstacle => {
          if (newX >= obstacle.x && newX <= obstacle.x + obstacle.width &&
              newY >= obstacle.y && newY <= obstacle.y + obstacle.height) {
            hitObstacle = true;
          }
        });
        
        if (hitObstacle) {
          return { ...bullet, active: false };
        }
        
        return { ...bullet, x: newX, y: newY };
      });
      
      // Проверяем попадание пуль в танки
      let updatedEnemies = [...enemies];
      let playerAlive = playerTank.alive;
      
      updatedBullets.forEach(bullet => {
        if (!bullet.active) return;
        
        // Проверяем попадание в игрока
        if (bullet.fromEnemy && playerTank.alive && checkTankBulletCollision(playerTank, bullet)) {
          playerAlive = false;
          setPlayerTank(prev => ({ ...prev, alive: false }));
          setGameOver(true);
          setGameActive(false);
          bullet.active = false;
        }
        
        // Проверяем попадание во врагов
        updatedEnemies = updatedEnemies.map(enemy => {
          if (enemy.alive && checkTankBulletCollision(enemy, bullet)) {
            bullet.active = false;
            return { ...enemy, alive: false };
          }
          return enemy;
        });
      });
      
      setEnemies(updatedEnemies);
      
      return updatedBullets.filter(bullet => bullet.active);
    });
  };

  // Функция отрисовки танка (игрока или врага)
  const drawTank = (ctx: CanvasRenderingContext2D, tank: Tank, isEnemy: boolean) => {
    const { x, y, angle } = tank;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Корпус танка
    ctx.fillStyle = isEnemy ? 'red' : 'green';
    ctx.fillRect(-15, -10, 30, 20);
    
    // Башня танка
    ctx.fillStyle = isEnemy ? 'darkred' : 'darkgreen';
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
      ctx.fillStyle = bullet.fromEnemy ? 'orange' : 'blue';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-[800px] mb-2">
        <div className="bg-white bg-opacity-70 p-2 rounded-md shadow-md">
          <p className="font-bold">Волна: {wave}</p>
          <p>Счет: {score}</p>
        </div>
        <div className="bg-white bg-opacity-70 p-2 rounded-md shadow-md">
          <p className="font-bold">Время: {gameTime}</p>
        </div>
      </div>
      
      <canvas 
        ref={canvasRef} 
        className="border-2 border-gray-800 shadow-lg cursor-crosshair" 
        tabIndex={0}
      />
      
      <div className="flex justify-between w-full max-w-[800px] mt-2">
        <div className="bg-white bg-opacity-70 p-2 rounded-md shadow-md text-sm">
          <p>Управление: WASD или стрелки</p>
          <p>Стрельба: левая кнопка мыши</p>
        </div>
        
        {gameOver && (
          <div className="bg-red-500 text-white p-2 rounded-md shadow-md">
            <p className="font-bold">Игра окончена!</p>
            <p>Нажмите 'R' для перезапуска</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TankGame;
