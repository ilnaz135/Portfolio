const modal = document.getElementById('modalOverlay');
        const openBtn = document.getElementById('openModal');
        const closeBtn = document.getElementById('closeModal');
        const saveBtn = document.getElementById('saveProfile');

        openBtn.onclick = () => modal.classList.add('active');
        closeBtn.onclick = () => modal.classList.remove('active');
        
        saveBtn.onclick = () => {
            const roleInput = document.getElementById('inputRole').value;
            const cloudInput = document.getElementById('inputCloud').value;
            const fileInput = document.getElementById('inputAvatarFile');
            const avatarDiv = document.getElementById('profileAvatar');

            if(roleInput) document.getElementById('displayRole').innerHTML = `<i class="fas fa-code"></i> ${roleInput}`;
            if(cloudInput) document.getElementById('displayCloud').innerHTML = `<i class="fab fa-github"></i> ${cloudInput}`;
            
            // Логика загрузки фото
            if (fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarDiv.style.backgroundImage = `url(${e.target.result})`;
                    avatarDiv.style.backgroundSize = 'cover';
                    avatarDiv.style.backgroundPosition = 'center';
                    avatarDiv.innerText = ''; // Убираем инициалы
                }
                reader.readAsDataURL(fileInput.files[0]);
            }

            modal.classList.remove('active');
        }

fetch("http://localhost:8000/api/v1/users")
  .then(res => res.json())
  .then(data => console.log(data));