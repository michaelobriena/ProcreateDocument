/* Procreate Document Class
 * Version 1.0.1 - 3rd June 2016
 * -----
 * Procreate belongs to Savage Interactive (http://procreate.si/)
 * -----
 * Uses the following libraries:
 *  BPList Parser: https://github.com/joeferner/node-bplist-parser
 *  Browserify: http://browserify.org/
 *  JSZip: https://stuk.github.io/jszip/
 *  MiniLZO: https://github.com/abraidwood/minilzo-js
 *  Node Buffer: https://www.npmjs.com/package/buffer
 */

var // Load JSZip
	JSZip = window.JSZip || (window.JSZip = require('../lib/jszip.min.js')),
	// Load the bplist-parser library
	BPList = window.BPList || (window.BPList = require('bplist-parser')),
	// Load the Uint8ArrayConverter library
	Uint8ArrayConverter = window.Uint8ArrayConverter || (window.Uint8ArrayConverter = require('../lib/Uint8ArrayConverter.js'));

// Load minilzo-js
require('../lib/lzo1x.js');

// The ProcreateDocument class
window.ProcreateDocument = function()
{
	// Create a global for the class
	var $this = this,

	// Stores triggerable events
	$events = [],

	// Whether the document has already been loaded
	$loaded = 0,

	// Keep score of how many video elements have loaded
	$videosready = 0,

	/** Manageable layer object */
	Layer = function()
	{
		// Create a global for this class
		var $layer = this,

		// Set the total and loaded chunk counts to zero
		$totalchunks  = 0,
		$loadedchunks = 0;

		/** Attempts to read the layer's chunks */
		$layer.load = function()
		{
			// If the layer contains data chunks
			if($layer.chunks)
			{
				// Create an image for the layer
				$layer.image = new Image();

				var // Create a canvas for the layer
					$lcanvas = document.createElement('canvas'),
					// Get the layer's canvas context
					$lcontext = $lcanvas.getContext('2d');

				// If an error occurs, log an error to the console
				$layer.image.onerror = function()
				{
					console.error('A chunk failed to load :(');
				};

				// When the layer image loads
				$layer.image.onload = function()
				{
					// Increment the loaded chunks count
					$loadedchunks ++;

					// If all the chunks have loaded
					if($loadedchunks == $totalchunks)
					{
						// Trigger a layerload event
						$this.trigger('layerload', $layer);
					}
				};

				// Set the layer canvas size
				$lcanvas.width = $this.$data.size[0];
				$lcanvas.height = $this.$data.size[1];

				// Iterate through the chunks
				for(var i in $layer.chunks)
				{
					// Get the current chunk
					var chunk = $layer.chunks[i];

					// If this is, in fact, a chunk
					if(chunk.name.match(/\/(.*?)\.chunk$/i))
					{
						// Increment the total chunks
						$totalchunks ++;

						// Load the chunk as a uint8 array
						chunk.async('uint8array').then(function(a)
						{
							// Create an lzo state
							var state =
							{
								inputBuffer: a,
								outputBuffer: null
							},

							// Begin with the first chunk
							chx = 0, chy = 0;

							// Iterate through the chunks
							for(var j in $layer.chunks)
							{
								// Increment chunk x
								chx ++;

								// If we have hit the last chunk on the x axis
								if((chx * $this.$data.tileSize) > $this.$data.size[0])
								{
									// Reset chunk x
									chx = 0;

									// Increment chunk y
									chy ++;
								}

								// If we are iterating past the current chunk
								if($layer.chunks[j].name == chunk.name)
								{
									// Decompress the chunk data
									lzo1x.decompress(state);

									var // Create a new canvas
										cvs = document.createElement('canvas'),
										// Get its context
										ctx = cvs.getContext('2d'),
										// Create a pixel
										pixel = ctx.createImageData(1, 1),
										// Get the pixel data object
										pdat = pixel.data,
										// Start x and y coordinates
										x = 0, y = 0;

									// Set the canvas width and height to the document's tile size
									cvs.width = $this.$data.tileSize;
									cvs.height = $this.$data.tileSize;

									// Write pixels to the canvas (sadly, this is how it has to be)
									for(var i = 0; i < state.outputBuffer.length; i += 4)
									{
										// Increment x
										x ++;
										
										// If we have hit the edge
										if(x > $this.$data.tileSize)
										{
											// Reset x
											x = 0;

											// Increment y
											y ++;
										}

										// Set up the pixel data
										pdat[0] = state.outputBuffer[i];
										pdat[1] = state.outputBuffer[i + 1];
										pdat[2] = state.outputBuffer[i + 2];
										pdat[3] = state.outputBuffer[i + 3];

										// Draw the pixel to the canvas
										ctx.putImageData(pixel, x, y);
									}

									// Save the canvas to the chunk
									$layer.chunks[j].canvas = cvs;

									// Draw the chunk to the layer
									$lcontext.drawImage(cvs, chx * $this.$data.tileSize, chy * $this.$data.tileSize);

									// Load the canvas data into the layer image
									$layer.image.src = $lcanvas.toDataURL('image/png');

									// Break the iteration
									break;
								}
							}
						});
					}
				}
			}

			// Return a failure
			return false;
		};
	};

	// If none of the dependencies are ready
	if(!Blob || !File || !FileReader || !JSZip)
	{
		// List of missing dependencies
		missing = [];

		// If Blob is missing
		if(!Blob)
		{
			// Add it to the list of missing dependencies
			missing.push('Blob');
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
	$this.filename = 'Untitled_Document.procreate';

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

	// Create a list of layers
	$this.layers = [];

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

				// Try to load the document binary property list (bplist) file
				files['Document.archive'].async('uint8array').then(function(a)
				{
					// Assemble the document
					$this.$data = Uint8ArrayConverter.toPlist(a);

					// Correctly format the document's size
					$this.$data.size = $this.$data.size.replace(/^{([0-9]+), ([0-9]+)}$/, '$1,$2').split(',');
					$this.$data.size[0] = parseFloat($this.$data.size[0]);
					$this.$data.size[1] = parseFloat($this.$data.size[1]);

					// Update the filename
					$this.filename = ($this.$data.name == '$null') ? file.name.replace(/\.procreate$/i, '') : $this.$data.name;

					// Trigger a filenamechange event
					$this.trigger('filenamechange', $this.filename);

					// Iterate through the document's layers
					for(var i in $this.$data.layers['NS.objects'])
					{
						var // Get the current layer
							layer = $this.$data.layers['NS.objects'][i],
							// Create a new layer object
							newlayer = new Layer();

						// Iterate through the layer's data
						for(var j in layer)
						{
							// Nobody needs a circular reference
							if(j != 'document')
							{
								// Copy the data to the new layer object
								newlayer[j] = layer[j];
							}
						}

						// Retrieve the new layer's chunks
						newlayer.chunks = zip.file(new RegExp('^' + newlayer.UUID + '\\/(.*?)\\.chunk$', 'i'));

						// Add the layer to the list and save its index
						newlayer.index = $this.layers.push(newlayer) - 1;

						// Load the new layer's chunks
						newlayer.load();
					}

					// Trigger a dataload event
					$this.trigger('dataload', $this.$data);
				}, function(e)
				{
					// Log any errors
					console.error(e);
				});

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

							// Trigger an frameload event
							$this.trigger('frameload', video);

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

								// Try to play the next clip
								try { next.play(); } catch(e){}

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
				}, function(e)
				{
					// Log any errors
					console.error(e);
				});
			}, function(e)
			{
				// Log any errors
				console.error(e);
			});
		};

		// Read the file as an array buffer
		reader.readAsArrayBuffer(file);
	};
};
