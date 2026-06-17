BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[invoices] ADD [utilityReadingId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[utility_readings] (
    [id] NVARCHAR(1000) NOT NULL,
    [roomId] NVARCHAR(1000) NOT NULL,
    [billingMonth] DATETIME2 NOT NULL,
    [electricityStart] FLOAT(53) NOT NULL,
    [electricityEnd] FLOAT(53) NOT NULL,
    [waterStart] FLOAT(53) NOT NULL,
    [waterEnd] FLOAT(53) NOT NULL,
    [electricityRate] FLOAT(53) NOT NULL CONSTRAINT [utility_readings_electricityRate_df] DEFAULT 3000,
    [waterRate] FLOAT(53) NOT NULL CONSTRAINT [utility_readings_waterRate_df] DEFAULT 15000,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [utility_readings_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [utility_readings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [utility_readings_roomId_billingMonth_key] UNIQUE NONCLUSTERED ([roomId],[billingMonth])
);

-- AddForeignKey
ALTER TABLE [dbo].[invoices] ADD CONSTRAINT [invoices_utilityReadingId_fkey] FOREIGN KEY ([utilityReadingId]) REFERENCES [dbo].[utility_readings]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[utility_readings] ADD CONSTRAINT [utility_readings_roomId_fkey] FOREIGN KEY ([roomId]) REFERENCES [dbo].[rooms]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
