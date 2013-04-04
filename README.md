sketch + search = skrch
---
skrch was an idea I had in mid-2011 (in a dream! true story). It was supposed to be an image search-engine that could search by:

1. Reverse-image lookup
2. Sketching
3. (A mixture of the two?)

I soon discovered OpenCV and decided to give it a try. Even though the server has been taken down, here's a video demonstration:

[![ScreenShot](http://skrch.dvt.name/skrch_ss.png)](http://youtu.be/3WswSywx6TI)

the code
---
The server is written in C++ and uses boost for serving HTTP, file system utilities, and serialization (the image data, once calculated, is stored locally), and OpenCV for the heavy lifting (canny filters, gaussian filters, histogram analysis).

The client is written in JS and won't be particularly useful to anyone devoid of its HTML counterpart found at http://skrch.dvt.name

how it works
---
1. skrch looks at all images found in `img_r`
2. Every image has a histogram and some metadata (found in `img_r/db.txt`) that gets stored in `db`
3. Once the analysis is finalized, the server starts up and begins accepting requests
4. The server accepts `POSTDATA` which (should) contain a needle image
5. The needle is compared with images in the haystack, and a hierarchy of "close" JSONified matches is returned back to the client

If there already exists a `db` file, steps (1) and (2) are forgone.

caveats
---
Memory problems. Only with around 10,000 images, requests would take more than 800ms and memory usage (on the server) would shoot up to 1-2gb. Unfortunately, no mainstream database software exists for histograms. (That would be a fun project.)