import mongoose, {Schema} from "mongoose";

const subscriptionSchema = Schema({

    subscriber: {
        type: mongoose.Types.ObjectId, //One who is subscribing
        ref: "User"
    },

    channel: {
        type: mongoose.Types.ObjectId, //One who is subscribed to
        ref: "User"
    },

    


}, {
    timestamps: true
});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
