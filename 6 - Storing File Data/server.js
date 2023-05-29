const express = require('express')
const multer = require("multer")
const crypto = require("node:crypto")

const { connectToDb } = require('./lib/mongo')
const {
    getImageInfoById,
    saveImageInfo,
    saveImageFile,
    getImageDownloadStreamByFilename
} = require('./models/image')

const app = express()
const port = process.env.PORT || 8000

const imageTypes = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif"
}

// app.use(express.json())

const upload = multer({
    storage: multer.diskStorage({
        destination: `${__dirname}/uploads`,
        filename: (req, file, callback) => {
            const filename = crypto.pseudoRandomBytes(16).toString("hex")
            const extension = imageTypes[file.mimetype]
            callback(null, `${filename}.${extension}`)
        }
    }),
    fileFilter: (req, file, callback) => {
        callback(null, !!imageTypes[file.mimetype])
    }
})

// app.use("/media/images", express.static("uploads/"))

app.get("/media/images/:filename", function (req, res, next) {
    getImageDownloadStreamByFilename(req.params.filename)
        .on("error", function (err) {
            if (err.code === "ENOENT") {
                next()
            } else {
                next(err)
            }
        })
        .on("file", function (file) {
            res.status(200).type(file.metadata.contentType)
        })
        .pipe(res)
})

app.get('/', (req, res, next) => {
    res.status(200).sendFile(__dirname + '/index.html')
})

app.post("/images", upload.single("image"), async function (req, res, next) {
    console.log("  -- req.file:", req.file)
    console.log("  -- req.body:", req.body)
    if (req.file && req.body && req.body.userId) {
        const image = {
            contentType: req.file.mimetype,
            filename: req.file.filename,
            path: req.file.path,
            userId: req.body.userId
        }
        // const id = await saveImageInfo(image)
        const id = await saveImageFile(image)
        // Delete image from uploads/
        res.status(200).send({
            id: id
        })
    } else {
        res.status(400).send({
            err: "Invalid file"
        })
    }
})

app.get('/images/:id', async (req, res, next) => {
    try {
        const image = await getImageInfoById(req.params.id)
        if (image) {
            // delete image.path
            const resBody = {
                _id: image._id,
                filename: image.filename,
                contentType: image.metadata.contentType,
                userId: image.metadata.userId,
                url: `/media/images/${image.filename}`
            }
            // image.url = `/media/images/${image.filename}`
            res.status(200).send(resBody)
        } else {
            next()
        }
    } catch (err) {
        next(err)
    }
})

app.use('*', (req, res, next) => {
    res.status(404).send({
        err: "Path " + req.originalUrl + " does not exist"
    })
})

/*
 * This route will catch any errors thrown from our API endpoints and return
 * a response with a 500 status to the client.
 */
app.use('*', (err, req, res, next) => {
    console.error("== Error:", err)
    res.status(500).send({
        err: "Server error.  Please try again later."
    })
})

connectToDb(() => {
    app.listen(port, () => {
        console.log("== Server is running on port", port)
    })
})
