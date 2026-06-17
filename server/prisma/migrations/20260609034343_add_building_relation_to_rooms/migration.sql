/*
  Warnings:

  - Added the required column `buildingId` to the `rooms` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[rooms] ADD [buildingId] NVARCHAR(1000) NOT NULL;

-- CreateTable
CREATE TABLE [dbo].[buildings] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [genderType] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [buildings_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [buildings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [buildings_name_key] UNIQUE NONCLUSTERED ([name])
);

-- AddForeignKey
ALTER TABLE [dbo].[rooms] ADD CONSTRAINT [rooms_buildingId_fkey] FOREIGN KEY ([buildingId]) REFERENCES [dbo].[buildings]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
