import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const watchLaterSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },

    savedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },

  {
    timestamps: true,
  }
);

watchLaterSchema.index({ video: 1, savedBy: 1 }, { unique: true });

watchLaterSchema.plugin(mongooseAggregatePaginate);

export const WatchLater = mongoose.model("WatchLater", watchLaterSchema);
