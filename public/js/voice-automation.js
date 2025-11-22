/**
 * Voice Automation System for T2YD
 * Handles voice recognition, intent extraction, and task automation
 */

class VoiceAutomation {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.currentIntent = null;
    this.supported = false;
    this.synthesis = null;
    this.voiceEnabled = true; // Enable voice responses by default
    this.commandReference = this.initializeCommandReference();
    this.init();
  }

  init() {
    // Check if browser supports Web Speech API for recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      this.supported = true;
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    // Check if browser supports Web Speech API for synthesis (TTS)
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  }

  initializeCommandReference() {
    // Comprehensive list of valid commands with examples and descriptions
    return {
      'add_truck': {
        primary: 'Add my truck',
        alternatives: ['Add my lorry', 'Register my vehicle', 'Create a new truck', 'New truck'],
        examples: [
          'Add my truck',
          'Add my truck vehicle number MH12AB1234',
          'Add my truck capacity 5 tons location Mumbai',
          'Add my truck vehicle number MH12AB1234 capacity 5 tons location Mumbai contact 9876543210'
        ],
        description: 'Opens the form to register a new truck or lorry'
      },
      'add_delivery': {
        primary: 'Add delivery',
        alternatives: ['Add shipment', 'Create delivery', 'New delivery', 'Add order'],
        examples: [
          'Add delivery',
          'Add delivery goods type electronics',
          'Add delivery pickup location Mumbai drop location Delhi',
          'Add delivery goods type furniture weight 100 kg pickup location Mumbai drop location Delhi'
        ],
        description: 'Opens the form to create a new delivery request'
      },
      'go_home': {
        primary: 'Go home',
        alternatives: ['Go to home', 'Show home', 'Navigate to home', 'Home page'],
        examples: ['Go home', 'Go to home', 'Show me home'],
        description: 'Navigates to the home page'
      },
      'go_dashboard': {
        primary: 'Go to dashboard',
        alternatives: ['Show dashboard', 'Open dashboard', 'My dashboard', 'Dashboard'],
        examples: ['Go to dashboard', 'Show my dashboard', 'Open dashboard'],
        description: 'Navigates to your dashboard'
      },
      'my_lorries': {
        primary: 'Show my lorries',
        alternatives: ['My lorries', 'View lorries', 'Show trucks', 'My vehicles'],
        examples: ['Show my lorries', 'View my trucks', 'My lorries'],
        description: 'View your registered lorries (transporters only)'
      },
      'my_deliveries': {
        primary: 'Show my deliveries',
        alternatives: ['My deliveries', 'View deliveries', 'Show shipments', 'My orders'],
        examples: ['Show my deliveries', 'View my deliveries', 'My deliveries'],
        description: 'View your delivery requests (shippers only)'
      },
      'go_profile': {
        primary: 'Go to profile',
        alternatives: ['Show profile', 'My profile', 'View profile', 'Open profile'],
        examples: ['Go to profile', 'Show my profile', 'My profile'],
        description: 'Opens your profile page'
      },
      'submit_form': {
        primary: 'Submit form',
        alternatives: ['Submit', 'Save form', 'Register', 'Create'],
        examples: ['Submit form', 'Submit the form', 'Save form'],
        description: 'Submits the current form if all required fields are filled'
      },
      'help': {
        primary: 'Help',
        alternatives: ['Show commands', 'What can you do', 'Show help', 'Commands'],
        examples: ['Help', 'Show commands', 'What can you do', 'Show help'],
        description: 'Shows available voice commands'
      }
    };
  }

  setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateUI(true);
      this.showFeedback('Listening...', 'info');
      // Optional: speak listening confirmation (can be annoying, so commented out)
      // this.speakResponse('Listening.');
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log('Voice input:', transcript);
      this.processCommand(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.handleError(event.error);
      this.isListening = false;
      this.updateUI(false);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateUI(false);
    };
  }

  startListening() {
    if (!this.supported) {
      this.showFeedback('Voice recognition not supported in your browser', 'error');
      return;
    }

    if (!this.recognition) {
      this.showFeedback('Voice recognition not available', 'error');
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      if (error.name === 'InvalidStateError') {
        // Already listening, ignore
        console.log('Already listening');
      } else {
        console.error('Error starting recognition:', error);
        this.showFeedback('Error starting voice recognition', 'error');
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  processCommand(transcript) {
    const intent = this.extractIntent(transcript);
    const entities = this.extractEntities(transcript, intent);

    console.log('Intent:', intent);
    console.log('Entities:', entities);

    if (!intent) {
      // Unrecognized command - provide voice feedback with suggestions
      this.handleUnrecognizedCommand(transcript);
      return;
    }

    this.executeIntent(intent, entities);
  }

  handleUnrecognizedCommand(transcript) {
    // Find similar commands based on keywords
    const suggestions = this.findSimilarCommands(transcript);
    
    // Generate helpful response
    let responseMessage = "I didn't recognize that command. ";
    
    if (suggestions.length > 0) {
      // Found similar commands
      if (suggestions.length === 1) {
        responseMessage += `Did you mean "${suggestions[0].primary}"? `;
        responseMessage += `Try saying: "${suggestions[0].primary}"`;
        
        // Voice response
        this.speakResponse(`That command is not recognized. Did you mean ${suggestions[0].primary}? Try saying ${suggestions[0].primary}`);
      } else {
        responseMessage += `Did you mean one of these? `;
        responseMessage += suggestions.slice(0, 3).map(cmd => `"${cmd.primary}"`).join(', ');
        
        // Voice response
        const cmdList = suggestions.slice(0, 3).map(cmd => cmd.primary).join(', or ');
        this.speakResponse(`That command is not recognized. Did you mean ${cmdList}?`);
      }
    } else {
      // No similar commands found - show common commands
      const commonCommands = [
        this.commandReference.add_truck,
        this.commandReference.add_delivery,
        this.commandReference.go_dashboard
      ];
      
      responseMessage += `Here are some common commands you can try: `;
      responseMessage += commonCommands.map(cmd => `"${cmd.primary}"`).join(', ');
      responseMessage += `. Or say "Help" for all available commands.`;
      
      // Voice response
      const commonCmdList = commonCommands.map(cmd => cmd.primary).join(', ');
      this.speakResponse(`That command is not recognized. Here are some commands you can try: ${commonCmdList}. Or say Help for all available commands.`);
    }
    
    // Show visual feedback
    this.showFeedback(responseMessage, 'error');
    
    // Show detailed help after a moment
    setTimeout(() => {
      this.showCommandSuggestions(suggestions.length > 0 ? suggestions : null);
    }, 2000);
  }

  findSimilarCommands(transcript) {
    const transcriptLower = transcript.toLowerCase();
    const suggestions = [];
    const keywordMatches = {};

    // Extract keywords from transcript
    const keywords = transcriptLower.split(/\s+/).filter(word => 
      word.length > 2 && 
      !['the', 'a', 'an', 'and', 'or', 'my', 'is', 'at', 'in', 'on', 'for'].includes(word)
    );

    // Score each command based on keyword matches
    for (const [intent, commandInfo] of Object.entries(this.commandReference)) {
      if (intent === 'help') continue; // Skip help command
      
      let score = 0;
      const commandText = (commandInfo.primary + ' ' + commandInfo.alternatives.join(' ')).toLowerCase();
      
      // Check for keyword matches
      keywords.forEach(keyword => {
        if (commandText.includes(keyword)) {
          score += 1;
        }
        
        // Check alternatives
        commandInfo.alternatives.forEach(alt => {
          if (alt.toLowerCase().includes(keyword)) {
            score += 0.5;
          }
        });
      });
      
      if (score > 0) {
        keywordMatches[intent] = { commandInfo, score };
      }
    }

    // Sort by score and return top matches
    const sorted = Object.entries(keywordMatches)
      .sort((a, b) => b[1].score - a[1].score)
      .map(([intent, data]) => data.commandInfo);
    
    return sorted;
  }

  showCommandSuggestions(suggestions) {
    // Create suggestions modal
    const modal = document.createElement('div');
    modal.id = 'voiceSuggestionsModal';
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 10002;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    let content = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: var(--error-700);">
          <i class="fas fa-exclamation-triangle"></i> Command Not Recognized
        </h3>
        <button onclick="this.closest('#voiceSuggestionsModal').remove()" 
                style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--neutral-500);">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    if (suggestions && suggestions.length > 0) {
      content += `<p style="color: var(--neutral-700); margin-bottom: 15px;">Did you mean one of these?</p>`;
      suggestions.slice(0, 5).forEach(cmd => {
        content += `
          <div style="margin-bottom: 15px; padding: 15px; background: var(--primary-50); border-radius: 8px; border-left: 4px solid var(--primary-500);">
            <div style="font-weight: 600; color: var(--primary-700); margin-bottom: 8px;">
              "${cmd.primary}"
            </div>
            <div style="font-size: 0.9rem; color: var(--neutral-600); margin-bottom: 8px;">
              ${cmd.description}
            </div>
            <div style="font-size: 0.85rem; color: var(--neutral-500);">
              <strong>Example:</strong> "${cmd.examples[0]}"
            </div>
          </div>
        `;
      });
    } else {
      content += `
        <p style="color: var(--neutral-700); margin-bottom: 15px;">Here are some common commands you can try:</p>
      `;
      
      const commonCommands = [
        this.commandReference.add_truck,
        this.commandReference.add_delivery,
        this.commandReference.go_dashboard,
        this.commandReference.my_lorries,
        this.commandReference.my_deliveries,
        this.commandReference.go_profile
      ];

      commonCommands.forEach(cmd => {
        content += `
          <div style="margin-bottom: 12px; padding: 12px; background: var(--primary-50); border-radius: 6px;">
            <div style="font-weight: 600; color: var(--primary-700); margin-bottom: 5px;">
              "${cmd.primary}"
            </div>
            <div style="font-size: 0.9rem; color: var(--neutral-600);">
              ${cmd.description}
            </div>
          </div>
        `;
      });
    }

    content += `
      <div style="margin-top: 20px; padding: 15px; background: var(--info-50); border-radius: 6px; border-left: 4px solid var(--info-500);">
        <strong style="color: var(--info-700);"><i class="fas fa-lightbulb"></i> Tip:</strong>
        <p style="margin: 8px 0 0 0; color: var(--neutral-700); font-size: 0.9rem;">
          Say <strong>"Help"</strong> to see all available voice commands with examples.
        </p>
      </div>
    `;

    modal.innerHTML = content;
    document.body.appendChild(modal);

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (modal.parentNode) {
        modal.style.transition = 'opacity 0.3s';
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
      }
    }, 10000);
  }

  speakResponse(text) {
    if (!this.synthesis || !this.voiceEnabled) {
      return; // TTS not supported or disabled
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 0.8;

    // Try to use a pleasant English voice
    const voices = this.synthesis.getVoices();
    const preferredVoices = voices.filter(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.includes('Female') || voice.name.includes('Google') || voice.name.includes('Microsoft'))
    );
    
    if (preferredVoices.length > 0) {
      utterance.voice = preferredVoices[0];
    } else if (voices.length > 0) {
      utterance.voice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    }

    // Speak
    this.synthesis.speak(utterance);

    // Handle speech events
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
    };
  }

  extractIntent(transcript) {
    // Check for submit command first
    if (/(?:submit|save|register|create)\s+(?:the\s+)?(?:form|truck|lorry|delivery|shipment)/i.test(transcript)) {
      // Check if we're on a form page
      const truckForm = document.querySelector('form[action="/lorries/add"]');
      const deliveryForm = document.querySelector('form[action="/deliveries/add"]');
      if (truckForm || deliveryForm) {
        this.handleAutoSubmit(truckForm || deliveryForm);
        return 'submit_form';
      }
    }

    // Command patterns for intent detection
    const patterns = {
      'add_truck': [
        /add\s+(?:my\s+)?(?:truck|lorry|vehicle)/i,
        /register\s+(?:my\s+)?(?:truck|lorry|vehicle)/i,
        /create\s+(?:a\s+)?(?:new\s+)?(?:truck|lorry|vehicle)/i,
        /new\s+(?:truck|lorry|vehicle)/i
      ],
      'add_delivery': [
        /add\s+(?:my\s+)?(?:delivery|shipment|order)/i,
        /create\s+(?:a\s+)?(?:new\s+)?(?:delivery|shipment|order)/i,
        /new\s+(?:delivery|shipment|order)/i,
        /request\s+(?:a\s+)?(?:delivery|shipment)/i
      ],
      'go_home': [
        /go\s+to\s+(?:home|main\s+page)/i,
        /show\s+(?:me\s+)?(?:home|main\s+page)/i,
        /navigate\s+to\s+(?:home|main)/i
      ],
      'go_dashboard': [
        /(?:go\s+to|show\s+me|open)\s+(?:my\s+)?dashboard/i,
        /show\s+(?:me\s+)?(?:the\s+)?dashboard/i
      ],
      'my_lorries': [
        /(?:show\s+me|go\s+to|open)\s+(?:my\s+)?(?:lorries|trucks|vehicles)/i,
        /view\s+(?:my\s+)?(?:lorries|trucks)/i
      ],
      'my_deliveries': [
        /(?:show\s+me|go\s+to|open)\s+(?:my\s+)?(?:deliveries|shipments|orders)/i,
        /view\s+(?:my\s+)?(?:deliveries|shipments)/i
      ],
      'go_profile': [
        /(?:go\s+to|show\s+me|open)\s+(?:my\s+)?profile/i,
        /view\s+(?:my\s+)?profile/i
      ],
      'help': [
        /(?:show\s+)?(?:me\s+)?(?:help|commands|what\s+can\s+you\s+do|what\s+commands)/i,
        /how\s+do\s+i\s+use/i,
        /what\s+are\s+the\s+voice\s+commands/i
      ]
    };

    for (const [intent, regexArray] of Object.entries(patterns)) {
      for (const regex of regexArray) {
        if (regex.test(transcript)) {
          return intent;
        }
      }
    }

    return null;
  }

  extractEntities(transcript, intent) {
    const entities = {};

    if (!intent) return entities;

    // Extract vehicle number (e.g., "MH12AB1234", "DL 01 AB 1234", "mh twelve ab one two three four")
    // First try standard format
    let vehicleNumberMatch = transcript.match(/(?:[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4}|[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4})/i);
    if (!vehicleNumberMatch) {
      // Try to find patterns like "vehicle number MH 12 AB 1234"
      vehicleNumberMatch = transcript.match(/(?:vehicle|number|plate)\s+(?:is|is\s+)?([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4}|[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4})/i);
      if (vehicleNumberMatch && vehicleNumberMatch[1]) {
        vehicleNumberMatch = [vehicleNumberMatch[1]];
      }
    }
    if (vehicleNumberMatch) {
      entities.vehicleNumber = vehicleNumberMatch[0].replace(/\s+/g, '').toUpperCase();
    }

    // Extract vehicle type
    if (/truck/i.test(transcript)) {
      entities.vehicleType = 'Truck';
    } else if (/container/i.test(transcript)) {
      entities.vehicleType = 'Container';
    }

    // Extract capacity/weight (numbers followed by tons, kg, etc.)
    const capacityMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(?:ton|tons|tonne|tonnes|kg|kilogram)/i);
    if (capacityMatch) {
      const value = parseFloat(capacityMatch[1]);
      if (/kg|kilogram/i.test(capacityMatch[0])) {
        entities.capacity = Math.round(value / 1000 * 100) / 100; // Convert kg to tons
      } else {
        entities.capacity = value;
      }
    }

    // Extract location (common patterns) - improved to handle more cases
    const locationPatterns = [
      /(?:in|at|from|to|currently\s+in|located\s+in|based\s+in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /(?:location|place|city|current\s+location)\s+(?:is|is\s+at|at)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /pickup\s+(?:location|place|city|from)?\s*(?:is|at)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /drop\s+(?:location|place|city|to)?\s*(?:is|at)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];
    
    const locations = [];
    locationPatterns.forEach(pattern => {
      try {
        const matches = [...transcript.matchAll(pattern)];
        matches.forEach(match => {
          if (match[1] && match[1].trim().length > 2) {
            const loc = match[1].trim();
            // Filter out common false positives
            if (!['from', 'to', 'the', 'at', 'in'].includes(loc.toLowerCase())) {
              locations.push(loc);
            }
          }
        });
      } catch (e) {
        // Pattern might not be supported, skip
      }
    });

    // Handle pickup and drop locations separately
    const pickupMatch = transcript.match(/pickup\s+(?:location|place|city|from)?\s*(?:is|at)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    const dropMatch = transcript.match(/drop\s+(?:location|place|city|to)?\s*(?:is|at)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    
    if (pickupMatch && pickupMatch[1]) {
      entities.location = pickupMatch[1].trim();
    } else if (locations.length > 0) {
      entities.location = locations[0]; // Take first location as current location
    }
    
    if (dropMatch && dropMatch[1]) {
      entities.dropLocation = dropMatch[1].trim();
    } else if (locations.length > 1) {
      entities.dropLocation = locations[1]; // Second location as drop location
    }

    // Extract phone number
    const phoneMatch = transcript.match(/(?:\+?\d{1,4}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}|\d{10}/);
    if (phoneMatch) {
      entities.contact = phoneMatch[0].replace(/[\s-()]/g, '');
    }

    // Extract goods type
    if (intent === 'add_delivery') {
      const goodsTypes = ['electronics', 'furniture', 'food', 'clothing', 'machinery', 'textiles', 'medicine', 'construction'];
      goodsTypes.forEach(type => {
        if (transcript.includes(type)) {
          entities.goodsType = type.charAt(0).toUpperCase() + type.slice(1);
        }
      });
    }

    // Extract weight for delivery
    if (intent === 'add_delivery') {
      const weightMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kilogramme)/i);
      if (weightMatch) {
        entities.weight = parseFloat(weightMatch[1]);
      }
    }

    // Extract dates (simple patterns)
    if (/today/i.test(transcript)) {
      entities.date = new Date().toISOString().split('T')[0];
    } else if (/tomorrow/i.test(transcript)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      entities.date = tomorrow.toISOString().split('T')[0];
    }

    return entities;
  }

  executeIntent(intent, entities) {
    switch (intent) {
      case 'add_truck':
        this.speakResponse('Opening the add truck form.');
        this.handleAddTruck(entities);
        break;
      case 'add_delivery':
        this.speakResponse('Opening the add delivery form.');
        this.handleAddDelivery(entities);
        break;
      case 'go_home':
        this.speakResponse('Navigating to home page.');
        window.location.href = '/';
        break;
      case 'go_dashboard':
        // Check user role to determine dashboard
        const userRole = this.getUserRole();
        this.speakResponse('Opening your dashboard.');
        if (userRole === 'transporter') {
          window.location.href = '/dashboard/transporter';
        } else if (userRole === 'shipper') {
          window.location.href = '/dashboard/shipper';
        }
        break;
      case 'my_lorries':
        this.speakResponse('Showing your lorries.');
        window.location.href = '/lorries/my';
        break;
      case 'my_deliveries':
        this.speakResponse('Showing your deliveries.');
        window.location.href = '/deliveries/my';
        break;
      case 'go_profile':
        this.speakResponse('Opening your profile.');
        window.location.href = '/profile';
        break;
      case 'help':
        this.showHelp();
        break;
      case 'submit_form':
        // Already handled in extractIntent
        break;
      default:
        this.showFeedback('Command executed but no action defined', 'warning');
    }
  }

  showHelp() {
    // Convert command reference to display format
    const commands = Object.values(this.commandReference)
      .filter(cmd => cmd.primary !== 'Help') // Don't show help command in list
      .map(cmd => ({
        command: cmd.primary,
        description: cmd.description,
        examples: cmd.examples
      }));

    const helpMessage = commands.map(cmd => 
      `<strong>${cmd.command}:</strong> ${cmd.description}`
    ).join('<br>');

    this.showFeedback(helpMessage, 'info');
    
    // Voice response for help
    const voiceHelpText = `Here are some commands you can try: ${commands.slice(0, 3).map(c => c.command).join(', ')}, and more. Check the help window for all commands.`;
    this.speakResponse(voiceHelpText);
    
    // Create a more detailed help modal
    const helpModal = document.createElement('div');
    helpModal.id = 'voiceHelpModal';
    helpModal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 10001;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;
    
    helpModal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: var(--primary-700);">
          <i class="fas fa-microphone"></i> Voice Commands Help
        </h2>
        <button onclick="this.closest('#voiceHelpModal').remove()" 
                style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--neutral-500);">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div style="line-height: 1.8; color: var(--neutral-700);">
        <p style="margin-bottom: 15px;">Try saying any of these commands:</p>
        ${commands.map(cmd => {
          const cmdInfo = this.commandReference[Object.keys(this.commandReference).find(
            key => this.commandReference[key].primary === cmd.command
          )] || cmd;
          return `
          <div style="margin-bottom: 12px; padding: 12px; background: var(--primary-50); border-radius: 6px;">
            <strong style="color: var(--primary-700); font-size: 1.05rem;">"${cmd.command}"</strong>
            <div style="margin-top: 6px; font-size: 0.9rem; color: var(--neutral-600); margin-bottom: 6px;">
              ${cmd.description || cmdInfo.description}
            </div>
            ${cmd.examples && cmd.examples.length > 0 ? `
              <div style="font-size: 0.85rem; color: var(--neutral-500);">
                <strong>Examples:</strong> ${cmd.examples.slice(0, 2).map(ex => `"${ex}"`).join(', ')}
              </div>
            ` : ''}
          </div>
        `;
        }).join('')}
        <div style="margin-top: 20px; padding: 15px; background: var(--warning-50); border-radius: 6px; border-left: 4px solid var(--warning-500);">
          <strong style="color: var(--warning-700);"><i class="fas fa-lightbulb"></i> Tips:</strong>
          <ul style="margin: 10px 0 0 20px; color: var(--neutral-700);">
            <li>You can provide details in your command, e.g., "Add my truck vehicle number MH12AB1234 capacity 5 tons location Mumbai"</li>
            <li>Make sure to allow microphone access when prompted</li>
            <li>Speak clearly and wait for the listening indicator</li>
          </ul>
        </div>
      </div>
    `;
    
    document.body.appendChild(helpModal);
    
    // Close on outside click
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        helpModal.remove();
      }
    });
  }

  handleAddTruck(entities) {
    // Check if we're already on the add truck page
    const currentForm = document.querySelector('form[action="/lorries/add"]');
    
    if (currentForm) {
      // Already on the form page, just fill it
      this.fillTruckForm(entities);
    } else {
      // Navigate to add truck form
      // Store entities in sessionStorage to fill after navigation
      sessionStorage.setItem('voiceEntities', JSON.stringify({ intent: 'add_truck', entities }));
      window.location.href = '/lorries/add';
    }
  }

  fillTruckForm(entities) {
    const form = document.querySelector('form[action="/lorries/add"]');
    if (!form) {
      console.error('Add truck form not found');
      return;
    }

    // Fill vehicle number
    if (entities.vehicleNumber) {
      const vehicleNumberInput = document.getElementById('vehicleNumber');
      if (vehicleNumberInput) {
        vehicleNumberInput.value = entities.vehicleNumber;
      }
    }

    // Fill vehicle type
    if (entities.vehicleType) {
      const vehicleTypeSelect = document.getElementById('vehicleType');
      if (vehicleTypeSelect) {
        vehicleTypeSelect.value = entities.vehicleType;
      }
    }

    // Fill capacity
    if (entities.capacity) {
      const capacityInput = document.getElementById('capacity');
      if (capacityInput) {
        capacityInput.value = entities.capacity;
      }
    }

    // Fill location
    if (entities.location) {
      const locationInput = document.getElementById('location');
      if (locationInput) {
        locationInput.value = entities.location;
      }
    }

    // Fill contact
    if (entities.contact) {
      const contactInput = document.getElementById('contact');
      if (contactInput) {
        contactInput.value = entities.contact;
      }
    }

    // Show feedback
    const filledFields = Object.keys(entities).filter(key => 
      ['vehicleNumber', 'vehicleType', 'capacity', 'location', 'contact'].includes(key) && entities[key]
    );
    
    // Check if all required fields are filled
    const requiredFields = ['vehicleNumber', 'vehicleType', 'capacity', 'location', 'contact'];
    const allFilled = requiredFields.every(field => {
      const input = document.getElementById(field === 'vehicleType' ? 'vehicleType' : field);
      return input && input.value && input.value.trim() !== '';
    });
    
    if (filledFields.length > 0) {
      if (allFilled) {
        this.showFeedback(`Form filled with ${filledFields.length} field(s). All required fields are complete. You can submit now.`, 'success');
        this.speakResponse(`Form filled with ${filledFields.length} fields. All required fields are complete. You can submit now.`);
      } else {
        const message = `Form opened and ${filledFields.length} field(s) filled. Please fill remaining required fields and submit.`;
        this.showFeedback(message, 'success');
        this.speakResponse(`Form opened. I've filled ${filledFields.length} field${filledFields.length > 1 ? 's' : ''}. Please fill the remaining required fields.`);
      }
      
      // Scroll to form
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Focus on first empty required field
      for (const field of requiredFields) {
        const input = document.getElementById(field === 'vehicleType' ? 'vehicleType' : field);
        if (input && (!input.value || input.value.trim() === '')) {
          setTimeout(() => input.focus(), 500);
          break;
        }
      }
    } else {
      this.showFeedback('Add truck form opened. Please fill in the details.', 'info');
      this.speakResponse('Add truck form opened. Please fill in the details.');
      // Focus on first field
      const firstInput = form.querySelector('input[required], select[required]');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 300);
      }
    }
  }

  handleAddDelivery(entities) {
    // Check if we're already on the add delivery page
    const currentForm = document.querySelector('form[action="/deliveries/add"]');
    
    if (currentForm) {
      // Already on the form page, just fill it
      this.fillDeliveryForm(entities);
    } else {
      // Navigate to add delivery form
      // Store entities in sessionStorage to fill after navigation
      sessionStorage.setItem('voiceEntities', JSON.stringify({ intent: 'add_delivery', entities }));
      window.location.href = '/deliveries/add';
    }
  }

  fillDeliveryForm(entities) {
    const form = document.querySelector('form[action="/deliveries/add"]');
    if (!form) {
      console.error('Add delivery form not found');
      return;
    }

    // Fill goods type
    if (entities.goodsType) {
      const goodsTypeInput = document.getElementById('goodsType');
      if (goodsTypeInput) {
        goodsTypeInput.value = entities.goodsType;
      }
    }

    // Fill weight
    if (entities.weight) {
      const weightInput = document.getElementById('weight');
      if (weightInput) {
        weightInput.value = entities.weight;
      }
    }

    // Fill pickup location
    if (entities.location) {
      const pickupLocationInput = document.getElementById('pickupLocation');
      if (pickupLocationInput) {
        pickupLocationInput.value = entities.location;
      }
    }

    // Fill drop location
    if (entities.dropLocation) {
      const dropLocationInput = document.getElementById('dropLocation');
      if (dropLocationInput) {
        dropLocationInput.value = entities.dropLocation;
      }
    }

    // Fill contact
    if (entities.contact) {
      const contactInput = document.getElementById('contact');
      if (contactInput) {
        contactInput.value = entities.contact;
      }
    }

    // Fill dates
    if (entities.date) {
      const pickupDateInput = document.getElementById('pickupDateTime');
      if (pickupDateInput) {
        const dateTime = new Date(entities.date);
        dateTime.setHours(12, 0, 0, 0);
        pickupDateInput.value = dateTime.toISOString().slice(0, 16);
      }
    }

    // Show feedback
    const filledFields = Object.keys(entities).filter(key => 
      ['goodsType', 'weight', 'location', 'dropLocation', 'contact', 'date'].includes(key) && entities[key]
    );
    
    // Check if all required fields are filled
    const requiredFields = ['goodsType', 'weight', 'pickupLocation', 'dropLocation', 'pickupDateTime', 'expectedDeliveryDate', 'contact'];
    const allFilled = requiredFields.every(field => {
      const input = document.getElementById(field);
      return input && input.value && input.value.trim() !== '';
    });
    
    if (filledFields.length > 0) {
      if (allFilled) {
        this.showFeedback(`Form filled with ${filledFields.length} field(s). All required fields are complete. You can submit now.`, 'success');
        this.speakResponse(`Form filled with ${filledFields.length} fields. All required fields are complete. You can submit now.`);
      } else {
        const message = `Form opened and ${filledFields.length} field(s) filled. Please fill remaining required fields and submit.`;
        this.showFeedback(message, 'success');
        this.speakResponse(`Form opened. I've filled ${filledFields.length} field${filledFields.length > 1 ? 's' : ''}. Please fill the remaining required fields.`);
      }
      
      // Scroll to form
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Focus on first empty required field
      for (const field of requiredFields) {
        const input = document.getElementById(field);
        if (input && (!input.value || input.value.trim() === '')) {
          setTimeout(() => input.focus(), 500);
          break;
        }
      }
    } else {
      this.showFeedback('Add delivery form opened. Please fill in the details.', 'info');
      this.speakResponse('Add delivery form opened. Please fill in the details.');
      // Focus on first field
      const firstInput = form.querySelector('input[required], select[required]');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 300);
      }
    }
  }

  handleAutoSubmit(form) {
    if (!form) return;

    // Check if all required fields are filled
    const requiredFields = form.querySelectorAll('input[required], select[required], textarea[required]');
    const emptyFields = Array.from(requiredFields).filter(field => {
      if (field.type === 'checkbox') {
        return !field.checked;
      }
      return !field.value || field.value.trim() === '';
    });

    if (emptyFields.length > 0) {
      const message = `Cannot submit: ${emptyFields.length} required field(s) are still empty.`;
      this.showFeedback(message, 'warning');
      this.speakResponse(`Cannot submit. ${emptyFields.length} required field${emptyFields.length > 1 ? 's are' : ' is'} still empty. Please fill them first.`);
      // Focus on first empty field
      emptyFields[0].focus();
      return;
    }

    // All required fields filled, ask for confirmation
    this.speakResponse('All required fields are filled. Do you want to submit the form now?');
    if (confirm('All required fields are filled. Do you want to submit the form now?')) {
      form.submit();
      this.showFeedback('Submitting form...', 'info');
      this.speakResponse('Submitting form now.');
    } else {
      this.showFeedback('Submission cancelled. You can review and submit manually.', 'info');
      this.speakResponse('Submission cancelled. You can review and submit manually.');
    }
  }

  getUserRole() {
    // Try to get user role from page content
    const userGreeting = document.querySelector('.user-greeting');
    if (userGreeting) {
      const roleMatch = userGreeting.textContent.match(/\(([^)]+)\)/);
      if (roleMatch) {
        return roleMatch[1].toLowerCase();
      }
    }
    return null;
  }

  updateUI(isListening) {
    const button = document.getElementById('voiceControlBtn');
    const indicator = document.getElementById('voiceIndicator');
    
    if (button) {
      if (isListening) {
        button.classList.add('listening');
        button.innerHTML = '<i class="fas fa-microphone-slash"></i> Stop Listening';
      } else {
        button.classList.remove('listening');
        button.innerHTML = '<i class="fas fa-microphone"></i> Voice Control';
      }
    }

    if (indicator) {
      if (isListening) {
        indicator.classList.add('active');
        indicator.innerHTML = '<i class="fas fa-circle"></i> Listening...';
      } else {
        indicator.classList.remove('active');
        indicator.innerHTML = '';
      }
    }
  }

  showFeedback(message, type = 'info') {
    // Remove existing feedback
    const existing = document.getElementById('voiceFeedback');
    if (existing) {
      existing.remove();
    }

    // Create feedback element
    const feedback = document.createElement('div');
    feedback.id = 'voiceFeedback';
    feedback.className = `voice-feedback voice-feedback-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    feedback.innerHTML = `
      <i class="fas fa-${icon}"></i>
      <span>${message}</span>
      <button class="voice-feedback-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    document.body.appendChild(feedback);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.style.animation = 'slideOutUp 0.3s ease';
        setTimeout(() => feedback.remove(), 300);
      }
    }, 5000);
  }

  handleError(error) {
    let message = 'Voice recognition error occurred';
    let voiceMessage = 'Sorry, there was an error with voice recognition. ';
    
    switch (error) {
      case 'no-speech':
        message = 'No speech detected. Please try again.';
        voiceMessage = "I didn't hear anything. Please try speaking again, or say Help for available commands.";
        break;
      case 'audio-capture':
        message = 'No microphone found. Please check your microphone.';
        voiceMessage = 'No microphone found. Please check your microphone connection and try again.';
        break;
      case 'not-allowed':
        message = 'Microphone permission denied. Please allow microphone access.';
        voiceMessage = 'Microphone permission denied. Please allow microphone access in your browser settings and try again.';
        break;
      case 'network':
        message = 'Network error. Please check your connection.';
        voiceMessage = 'Network error occurred. Please check your internet connection and try again.';
        break;
      case 'aborted':
        message = 'Voice recognition aborted.';
        voiceMessage = 'Voice recognition was stopped.';
        break;
      default:
        message = `Error: ${error}`;
        voiceMessage = `An error occurred: ${error}. Please try again.`;
    }

    this.showFeedback(message, 'error');
    
    // Provide voice response for errors
    if (error !== 'aborted') {
      this.speakResponse(voiceMessage);
    }
  }
}

// Initialize voice automation when DOM is ready
let voiceAutomation = null;

document.addEventListener('DOMContentLoaded', () => {
  voiceAutomation = new VoiceAutomation();
  
  // Setup voice control button
  const voiceBtn = document.getElementById('voiceControlBtn');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (voiceAutomation.isListening) {
        voiceAutomation.stopListening();
      } else {
        voiceAutomation.startListening();
      }
    });
  }

  // Check if we have stored voice entities from previous navigation
  const storedVoiceData = sessionStorage.getItem('voiceEntities');
  if (storedVoiceData) {
    try {
      const { intent, entities } = JSON.parse(storedVoiceData);
      sessionStorage.removeItem('voiceEntities'); // Clear after use
      
      // Wait a bit for form to be fully loaded
      setTimeout(() => {
        if (intent === 'add_truck') {
          voiceAutomation.fillTruckForm(entities);
        } else if (intent === 'add_delivery') {
          voiceAutomation.fillDeliveryForm(entities);
        }
      }, 300);
    } catch (error) {
      console.error('Error parsing stored voice data:', error);
    }
  }
});

// Export for global access if needed
window.VoiceAutomation = VoiceAutomation;

