/* Uint8ArrayToPlist Library
 */

var // Load the bplist-parser library
	BPList = require('bplist-parser');

exports.toPlist = function(u8a)
{
	var // Create a new node buffer
		buff = new Buffer(u8a),
		// Decode the binary file and create a javascript object containing the document's inner secrets
		doc = BPList.parseBuffer(buff),
		// Assembly function to stitch the document's data together
		assemble = function(o, l)
		{
			// Start a layer counter
			l = l || 0;

			// If the object contains a UID and is not a circular reference
			if(o.UID !== undefined && o.UID != 1)
			{
				// Assemble and return the referenced data value
				return assemble(doc[o.UID], l + 1);
			}
			// If the object is a Uint8Array
			else if(typeof o == 'object' && o instanceof Uint8Array)
			{
				// Ignore it (for now (in the future I'd like to try and decode Uint8Arrays))
				return o;
			}
			// If we are looking at an object
			else if(typeof o == 'object')
			{
				// Create a new object
				var x = {};

				// Iterate through the object
				for(var i in o)
				{
					// Assemble the key/value pair
					x[i] = assemble(o[i], l + 1);
				}

				// Return the new object
				return x;
			}
			// If we are looking at a string
			else if(typeof o == 'string')
			{
				// If the string is actually a null pointer
				if(o == '$null')
				{
					// Return the proper null
					return null;
				}
				// If the string is actually a number
				else if(o.match(/^\-?([0-9]+)(\.([0-9]+))?$/))
				{
					// Convert it to an actual number
					return parseFloat(o);
				}
			}

			// All else fails and we're not sure what to do, return the object
			return o;
		};

	// Trash the outside of the objects dict
	doc = doc[0]['$objects'];

	// Assemble the document
	return assemble(doc[1]);
};

exports.toString = function(u8a, enc)
{
	return new TextDecoder(enc || 'utf-8').decode(u8a);
};

exports.toTypedStream = function(u8a)
{
	var str = exports.toString(u8a, 'ascii');

	console.log(str);
};