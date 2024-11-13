 function startCountdown(endTime) {
    const startTime = new Date().getTime();
    const countdownMinutes = 5; // Укажите длительность таймера в минутах
    endTime = endTime * 1000;

    const canvas = document.getElementById('timerCanvas');
    const ctx = canvas.getContext('2d');
    const timerText = document.getElementById('timerText');

    canvas.width = 75;
    canvas.height = 75;
    const radius = canvas.width / 2 - 10;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    function updateTimer() {
      const now = new Date().getTime();
      const remainingTime = Math.max(0, endTime - now);
      const totalSeconds = Math.floor(remainingTime / 1000);
      const percent = remainingTime / (endTime - startTime);

      timerText.innerHTML = `${totalSeconds.toString().padStart(2, '0')}`;
      timerText.style.display = 'block';

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        radius,
        -Math.PI / 2,
        -Math.PI / 2 - 2 * Math.PI * percent,
        true  // Направление по часовой стрелке
      );
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'blue';
      ctx.stroke();

      if (remainingTime > 0) {
        requestAnimationFrame(updateTimer);
      } else {
          timerText.style.display = 'none';
      }
    }

    updateTimer();
  }



