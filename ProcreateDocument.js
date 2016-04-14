/* Procreate Document Class
 * Version 1.0.1 - 14th April 2016
 * -----
 * Procreate belongs to Savage Interactive (http://procreate.si/)
 * Dependencies: Blob.js, JSZip
 */
var ProcreateDocument = function()
{
	// Create a global for the class
	var $this = this,

	// Stores triggerable events
	$events = [],

	// Whether the document has already been loaded
	$loaded = 0,

	// Keep score of how many video elements have loaded
	$videosready = 0;

	// If none of the dependencies are ready
	if(!Blob || !File || !FileReader || !JSZip)
	{
		// List of missing dependencies
		missing = [];

		// If Blob is missing
		if(!Blob)
		{
			// Add it to the list of missing dependencies
			missing.push('Blob.js (https://github.com/eligrey/Blob.js/)');
		}

		// If File is missing
		if(!File)
		{
			// Add it to the list of missing dependencies
			missing.push('File');
		}

		// If FileReader is missing
		if(!FileReader)
		{
			// Add it to the list of missing dependencies
			missing.push('FileReader');
		}

		// If JSZip is missing
		if(!JSZip)
		{
			// Add it to the list of missing dependencies
			missing.push('JSZip (https://stuk.github.io/jszip/)');
		}

		// Throw an error :(
		throw new Error('ProcreateDocument: The following dependencies are missing: ' + missing.join(', '));

		// Cancel the creation of the document
		return null;
	}

	// Bindable events
	$this.on = function(ev, cb)
	{
		// If a string was supplied
		if(typeof ev == 'string')
		{
			// Convert the handler types into an array
			ev = ev.split(' ');
		}

		// Iterate through the event handler types
		for(var i in ev)
		{
			// Create the event type store if it doesn't exist already
			($events[ev[i]] = ($events[ev[i]] || []))

			// Add the event handler to the event type store
			.push(cb);
		}

		// Promise the scope
		return $this;
	};

	// Unbinds bound events
	$this.off = function(ev, cb)
	{
		// If a string was supplied
		if(typeof ev == 'string')
		{
			// Convert the handler types into an array
			ev = ev.split(' ');
		}

		// Iterate through the event handler types
		for(var i in ev)
		{
			var handler = ev[i]; // The current handler

			// If a callback condition wasn't supplied
			if(!cb)
			{
				$events[handler] = [];
			}

			// Otherwise, iterate through currently defined event handlers
			else for(var j in $events[handler])
			{
				// If the callback matches, delete the event handler
				if($events[handler][j] == cb)
				{
					$events[handler][j] = null;
				}
			}
		}

		// Promise the scope
		return $this;
	};

	// Calls a bound event
	$this.trigger = function(ev)
	{
		var $args = []; // Arguments

		// Iterate through all arguments past the event handler type
		for(var i = 1; i < arguments.length; i ++)
		{
			// Add the argument to a list
			$args.push(arguments[i]);
		}

		// If a string was supplied
		if(typeof ev == 'string')
		{
			// Convert the handler types into an array
			ev = ev.split(' ');
		}

		// Iterate through the event handler types
		for(var i in ev)
		{
			var handler = ev[i]; // The current handler

			// If the event type store exists
			if($events[handler])
			{
				// Iterate through the defined event handlers
				for(var j in $events[handler])
				{
					// Call the event handler and supply any additional data. If the handler returned false
					if($events[handler][j] && typeof $events[handler][j] == 'function' && $events[handler][j].apply($this, $args) === false)
					{
						// Prevent any further event handlers from firing
						return false;
					}
				}
			}
		}

		// Promise the scope
		return $this;
	};

	// The name of this file
	$this.filename = 'Untitled.procreate';

	// Create an image file for the thumbnail
	$this.thumbnail = document.createElement('img');

	// When the thumbnail loads
	$this.thumbnail.onload = function()
	{
		// Trigger an thumbnailload event
		$this.trigger('thumbnailload', this);
	};

	// Create a list of video elements
	$this.videos = [];

	// Loads a file into the document
	$this.load = function(file)
	{
		// If a valid file was not supplied or the document was already loaded
		if(!file || !(file instanceof File) || (file instanceof File && !file.name.match(/^(.*)\.procreate$/i)) || $loaded)
		{
			// Cancel the script
			return $this;
		}

		// Before the document has started to load
		$this.trigger('beforeload');

		// Mark the document as loaded
		$loaded = 1;

		// Update the filename
		$this.filename = file.name;

		// Trigger a filenamechange event
		$this.trigger('filenamechange', $this.filename);

		// Create a new file reader
		var reader = new FileReader();

		// When the file reader finished reading
		reader.onload = function(e)
		{
			// Create a new archive (procreate's file format is basically a renamed 'zip' file) and load the procreate file
			new JSZip().loadAsync(e.target.result).then(function(zip)
			{
				// Trigger a beforeparse event
				$this.trigger('beforeparse', zip);

				// Get a list of all files
				var files = zip.files,

				// Create an empty list for video clips
				videos = [];

				// Get the thumbnail file and read it as base64 data
				files['QuickLook/Thumbnail.png'].async('base64').then(function(a)
				{
					// Populate the thumbnail with the retrieved image data
					$this.thumbnail.src = 'data:image/png;base64,' + a;

					// Iterate through files within the zip
					for(var i in files)
					{
						// If the filename matches the videos directory
						if(i.match(/^video\/segments\//i))
						{
							// Store the video
							videos.push(files[i]);
						}
					}

					// Create a private scope to load each video with
					function preload(videoFile, video)
					{
						// Create a source element
						var source = document.createElement('source');

						// Give the source a mimetype
						source.type = 'video/mp4';

						// Append the source to the video
						video.appendChild(source);

						// Get the video file and load it as base64 data
						videoFile.async('base64').then(function(a)
						{
							// Increment the loaded videos count
							$videosready ++;

							// Populate the source element with the video data
							source.src = 'data:video/mp4;base64,' + a;

							// Trigger an videoload event
							$this.trigger('videoload', video);

							// If all the videos have loaded
							if($videosready == $this.videos.length)
							{
								// Trigger a videoload event
								$this.trigger('videoload');
							}
						});

						// When the video finishes playing
						video.onended = function()
						{
							// Get the index of this video
							var id = parseInt(this.id),

							// Get the next video
							next = $this.videos[id] || false;

							// If there is a next video
							if(next)
							{
								// Show the next clip
								next.className = 'active';

								// Play the next clip
								next.play();

								// Hide this clip
								this.className = '';
								this.currentTime = 0;
							}

							// If the last video just finished playing
							else
							{
								// Trigger an ended event
								$this.trigger('ended');
							}
						};
					};

					// If there are videos within the document
					if(videos && videos.length > 0)
					{
						// Store a regex object for sorting the videos by name
						var nameregex = /^(.*)\/segment-([0-9]+)\.m4v$/i;

						// Sort the videos by name
						videos.sort(function(a, b)
						{
							// Return a comparison of the videos' indexes
							return parseInt(a.name.replace(nameregex, '$2')) - parseInt(b.name.replace(nameregex, '$2'));
						});

						// Iterate through the videos
						for(var i = 0; i < videos.length; i ++)
						{
							// Create a video element
							var video = document.createElement('video');

							// Give the video an index
							video.id = $this.videos.push(video);

							// Load the video
							preload(videos[i], video);
						}
					}
				});
			});
		};

		// Read the file as an array buffer
		reader.readAsArrayBuffer(file);
	};
};
