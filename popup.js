document.addEventListener('DOMContentLoaded', function() {
    const checkbox = document.querySelector('input[type="checkbox"]');
    const switchLabel = document.querySelector('.switch');
    const micIcon = document.querySelector('.mic-icon');
    const classGrid = document.querySelector('.class-grid');
    const sectionTitle = document.querySelector('.section-title');

    const API_URL = 'http://127.0.0.1:5000/api/courses';
    
    switchLabel.setAttribute('data-tooltip', 'Click to mute');

    checkbox.addEventListener('change', function() {
        if (this.checked) {
            switchLabel.setAttribute('data-tooltip', 'Click to unmute');
            micIcon.style.stroke = '#ff0000';
        } else {
            switchLabel.setAttribute('data-tooltip', 'Click to mute');
            micIcon.style.stroke = '#000000';
        }
    });

    chrome.storage.sync.get(['canvasApiKey', 'canvasApiUrl'], function(data) {
        if (!data.canvasApiKey) {
            showApiKeyRequiredMessage();
        } else {
            fetchCourses(data.canvasApiKey, data.canvasApiUrl || 'https://canvas.instructure.com');
        }
    });

    function showApiKeyRequiredMessage() {
        classGrid.innerHTML = '';
        sectionTitle.textContent = 'Setup Required';
        
        const msgContainer = document.createElement('div');
        msgContainer.className = 'api-key-message';
        msgContainer.style.gridColumn = '1 / -1';
        msgContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        msgContainer.style.borderRadius = '8px';
        msgContainer.style.padding = '20px';
        msgContainer.style.textAlign = 'center';
        msgContainer.style.color = '#333';
        
        const msgTitle = document.createElement('h4');
        msgTitle.style.color = '#1915ff';
        msgTitle.style.marginTop = '0';
        msgTitle.textContent = 'Canvas API Key Required';
        
        const msgText = document.createElement('p');
        msgText.textContent = 'To use Focus, you need to provide your Canvas API key. This allows the extension to access your course information.';
        
        const setupButton = document.createElement('button');
        setupButton.textContent = 'Set Up API Key';
        setupButton.style.backgroundColor = '#1915ff';
        setupButton.style.color = 'white';
        setupButton.style.border = 'none';
        setupButton.style.padding = '10px 20px';
        setupButton.style.borderRadius = '5px';
        setupButton.style.cursor = 'pointer';
        setupButton.style.fontFamily = '"Times New Roman", Times, serif';
        setupButton.style.fontWeight = 'bold';
        setupButton.style.marginTop = '15px';
        
        setupButton.addEventListener('click', function() {
            window.location.href = 'settings.html';
        });
        
        msgContainer.appendChild(msgTitle);
        msgContainer.appendChild(msgText);
        msgContainer.appendChild(setupButton);
        classGrid.appendChild(msgContainer);
    }

    async function fetchCourses(apiKey, apiUrl) {
        try {
            showLoadingIndicator();
            
            console.log('Fetching courses with API key:', apiKey.substring(0, 8) + '...');
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    api_url: apiUrl
                })
            });
            
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            
            const courses = await response.json();
            
            hideLoadingIndicator();
            
            if (courses.error) {
                if (courses.error.includes('unauthorized')) {
                    showError('Your Canvas API key appears to be invalid. Please check your settings.');
                    setTimeout(() => {
                        window.location.href = 'settings.html';
                    }, 3000);
                    return;
                }
                showError(`Error: ${courses.error}`);
                return;
            }
            
            if (courses.length === 0) {
                showNoCoursesMessage();
                return;
            }
            
            populateClassGrid(courses);
            
            setupClassBoxEventHandlers();
            
        } catch (error) {
            console.error('Failed to fetch courses:', error);
            hideLoadingIndicator();
            showError('Failed to load your courses. Please try again later. Check that the Flask server is running at http://127.0.0.1:5000');
        }
    }
    
    function showLoadingIndicator() {
        classGrid.innerHTML = '';
        
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-indicator';
        loadingEl.innerHTML = 'Loading your courses...';
        loadingEl.style.gridColumn = '1 / -1';
        loadingEl.style.textAlign = 'center';
        loadingEl.style.padding = '20px';
        loadingEl.style.color = '#ffffff';
        classGrid.appendChild(loadingEl);
    }
    
    function hideLoadingIndicator() {
        const loadingEl = document.querySelector('.loading-indicator');
        if (loadingEl) {
            loadingEl.remove();
        }
    }
    
    function showError(message) {
        classGrid.innerHTML = '';
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.innerHTML = message;
        errorEl.style.gridColumn = '1 / -1';
        errorEl.style.textAlign = 'center';
        errorEl.style.padding = '20px';
        errorEl.style.color = '#ff6666';
        classGrid.appendChild(errorEl);
        
        showNotification(message, 'error');
    }
    
    function showNoCoursesMessage() {
        classGrid.innerHTML = '';
        const msgEl = document.createElement('div');
        msgEl.className = 'no-courses-message';
        msgEl.innerHTML = 'You are not enrolled in any active courses.';
        msgEl.style.gridColumn = '1 / -1';
        msgEl.style.textAlign = 'center';
        msgEl.style.padding = '20px';
        msgEl.style.color = '#ffffff';
        classGrid.appendChild(msgEl);
    }
    
    function populateClassGrid(courses) {
        classGrid.innerHTML = '';
        
        courses.forEach(course => {
            const classBox = document.createElement('div');
            classBox.className = 'class-box';
            classBox.setAttribute('data-channel', course.id);
            
            const title = document.createElement('h4');
            title.textContent = course.name;
            
            const description = document.createElement('p');
            description.textContent = course.description || course.code;
            
            const students = document.createElement('span');
            students.className = 'participants';
            students.textContent = `${course.students} students`;
            
            classBox.appendChild(title);
            classBox.appendChild(description);
            classBox.appendChild(students);
            
            classGrid.appendChild(classBox);
        });
    }
    
    function setupClassBoxEventHandlers() {
        const classBoxes = document.querySelectorAll('.class-box');
        
        let activeClass = null;
        
        classBoxes.forEach(box => {
            box.addEventListener('click', function() {
                const channelId = this.getAttribute('data-channel');
                const channelName = this.querySelector('h4').textContent;
                
                if (activeClass === this) {
                    leaveVoiceChannel(channelId, channelName);
                    this.classList.remove('active');
                    activeClass = null;
                } 
                else {
                    if (activeClass) {
                        const previousChannelId = activeClass.getAttribute('data-channel');
                        const previousChannelName = activeClass.querySelector('h4').textContent;
                        leaveVoiceChannel(previousChannelId, previousChannelName);
                        activeClass.classList.remove('active');
                    }
                    
                    joinVoiceChannel(channelId, channelName);
                    this.classList.add('active');
                    activeClass = this;
                }
            });
        });
    }
    
    function joinVoiceChannel(channelId, channelName) {
        console.log(`Joining voice channel: ${channelId} - ${channelName}`);
        
        showNotification(`JOINED ${channelName}`);
    }
    
    function leaveVoiceChannel(channelId, channelName) {
        console.log(`Leaving voice channel: ${channelId} - ${channelName}`);
        
        showNotification(`LEFT ${channelName}`, 'left');
    }
    
    function showNotification(message, type = 'info') {
        let notificationContainer = document.querySelector('.notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
});