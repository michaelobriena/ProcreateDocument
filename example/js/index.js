$(function()
{
	// When the user drags things over the document
	$(window).on('dragenter dragover', function(e)
	{
		// Cancel default events
        e.preventDefault();
        e.stopPropagation();
    })
	// When the user drops a file on the document
	.on('drop', function(e)
	{
		// Create a new Procreate document
		var doc = new ProcreateDocument();
		
		// When the document loads
		doc.on('load', function()
		{
			// Remove the 'empty' class from the viewer
			$('.viewer.empty').removeClass('empty');
		})
		
		// When the thumbnail file loads
		.on('thumbnailload', function(thumbnail)
		{
			// Remove the 'empty' and 'loading' classes from the viewer
			$('.viewer').removeClass('empty loading')
			
			// Set the viewer background image
			.find('.thumbnail img').attr('src', thumbnail.src);
		})
		
		// When the videos have loaded
		.on('videoload', function()
		{
			// Remove the 'empty' and 'loading' classes from the viewer
			$('.viewer').removeClass('empty loading')
			
			// Deactivate the thumbnail
			.find('.thumbnail').removeClass('active');
			
			// Activate the videos
			$('.viewer .videos').addClass('active');
			
			// Iterate through the videos
			for(var i in doc.videos)
			{
				// Append the video element to the DOM
				$('.viewer .videos').append(doc.videos[i]);
			}

			// Mark the first video as active and play it
			$('.viewer .videos video').first().addClass('active')[0].play();
		})
		
		// Before a new document is loaded
		.on('beforeload', function()
		{
			// Tell the viewer it is loading
			$('.viewer').addClass('loading');
			
			// Clear out old document data and deactivate the video
			$('.viewer .videos').removeClass('active').html('');
			
			// Activate the thumbnail
			$('.viewer .thumbnail').addClass('active')
			
			// Remove the image src
			.find('img').removeAttr('src');
		})
		
		// When the filename is updated
		.on('filenamechange', function(filename)
		{
			// Relay the update to the DOM
			$('.viewer .filename').html(filename);
		});
		
		// Load the document
		doc.load(e.originalEvent.dataTransfer.files[0]);
		
		// Cancel default events
		e.preventDefault();
        e.stopPropagation();
		return false;
	});
});