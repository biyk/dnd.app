export  function loadInitiativeData() {
        fetch("/api/config/init")
            .then(response => {
                if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
                return response.json();
            })
            .then(data => {
                this.currentRound = data.round || 0;
                this.currentCharacterIndex = data.try || 0;
                this.charactersData = data.all || [];
                this.displayInfoBlocks();
                this.displayCharacters();
            })
            .catch(error => console.error("Ошибка при загрузке данных:", error));
    }

      // Функция для отправки данных на сервер
export  function  sendInit() {
        const dataToSend = {
            round: this.currentRound,
            try: this.currentCharacterIndex,
            all: this.charactersData,
            rating: this.rating,
            next: this.nextCharacterIndex
        };

        fetch("/api/config/init", {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=UTF-8" },
            body: JSON.stringify(dataToSend)
        }).catch(error => console.error("Ошибка при отправке данных:", error));
    }