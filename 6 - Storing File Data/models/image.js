const { ObjectId, GridFSBucket } = require('mongodb')
const fs = require("node:fs")

const { getDbReference } = require('../lib/mongo')

exports.saveImageInfo = async function (image) {
    const db = getDbReference()
    const collection = db.collection('images')
    const result = await collection.insertOne(image)
    return result.insertedId
}

exports.saveImageFile = async function (image) {
    return new Promise(function (resolve, reject) {
        const db = getDbReference()
        const bucket = new GridFSBucket(db, { bucketName: "images" })
        const metadata = {
            contentType: image.contentType,
            userId: image.userId
        }
        const uploadStream = bucket.openUploadStream(
            image.filename,
            { metadata: metadata }
        )
        fs.createReadStream(image.path).pipe(uploadStream)
            .on("error", function (err) {
                reject(err)
            })
            .on("finish", function (result) {
                console.log("== write success, result:", result)
                resolve(result._id)
            })
    })
}

exports.getImageInfoById = async function (id) {
    const db = getDbReference()
    // const collection = db.collection('images')
    const bucket = new GridFSBucket(db, { bucketName: "images" })
    if (!ObjectId.isValid(id)) {
        return null
    } else {
        const results = await bucket.find({ _id: new ObjectId(id) })
            .toArray()
        console.log("== results:", results)
        // const results = await collection.find({ _id: new ObjectId(id) })
        //     .toArray()
        return results[0]
    }
}

exports.getImageDownloadStreamByFilename = function (filename) {
    const db = getDbReference()
    const bucket = new GridFSBucket(db, { bucketName: "images" })
    return bucket.openDownloadStreamByName(filename)
}
